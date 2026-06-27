/**
 * Autonomous campaign executor — shared by the daily cron AND the one-tap
 * "Approve" button on the dashboard. Given a merchant + a trigger, it builds
 * the audience, writes each message with Yara, sends it, charges credits, and
 * records everything. This is the exact same send/credit/compliance path the
 * cron uses, so manual approval and autopilot behave identically.
 *
 * (The cron currently has its own copy of runTrigger; it can be switched to
 * import from here in a later cleanup. Keeping them parallel for now avoids
 * touching the running autonomous job.)
 */
import { createServiceClient } from '@/lib/supabase/server'
import { sendWinBackEmail } from '@/lib/email'
import { deductCredits, deductCampaignFee, CREDIT_COSTS } from '@/lib/credits'
import { generateYaraCopy, type TriggerType } from '@/lib/yara'
import { preCheckCompliance, recordMessageSent } from '@/lib/compliance'
import { logCampaignSent } from '@/lib/outcome'
import type { ContextSnapshot } from '@/lib/context-engine'

export interface TriggerResult {
  ok: boolean
  sent?: number
  skipped?: number
  estRevenue?: number
  campaignId?: string
  reason?: string
  error?: string
}

export function segmentsForTrigger(trigger: TriggerType): string[] {
  switch (trigger) {
    case 'win_back':     return ['at_risk', 'lapsed']
    case 'new_customer': return ['new']
    case 'vip_reward':   return ['loyal']
    case 'birthday':     return ['new', 'active', 'loyal', 'at_risk']
    case 'cross_sell':   return ['active', 'loyal']
  }
}

function isBirthdayWindow(birthday: string | null, now: Date): boolean {
  if (!birthday) return false
  const parts = birthday.split('-')
  const mmdd = parts.length === 3 ? `${parts[1]}-${parts[2]}` : birthday
  const bDate = new Date(`${now.getFullYear()}-${mmdd}`)
  if (isNaN(bDate.getTime())) return false
  return Math.abs((bDate.getTime() - now.getTime()) / 86400000) <= 3
}

const CUSTOMER_COLS = 'id, name, email, phone, segment, control_group, total_orders, lifetime_value, avg_order_value, last_purchase_at, favorite_items, birthday, sms_opt_out'

interface TriggerConfig {
  label: string
  contactCutoffDays: number
  buildQuery: (service: ReturnType<typeof createServiceClient>, merchantId: string, now: Date) => Promise<any[]>
}

export const TRIGGER_CONFIGS: Record<TriggerType, TriggerConfig> = {
  win_back: {
    label: 'win_back', contactCutoffDays: 30,
    buildQuery: async (service, merchantId) => {
      const { data } = await service.from('customers').select(CUSTOMER_COLS)
        .eq('merchant_id', merchantId).in('segment', ['at_risk', 'lapsed'])
        .not('email', 'is', null).eq('control_group', false)
      return data ?? []
    },
  },
  new_customer: {
    label: 'new_customer', contactCutoffDays: 30,
    buildQuery: async (service, merchantId, now) => {
      const ago14 = new Date(now.getTime() - 14 * 86400000).toISOString()
      const { data } = await service.from('customers').select(CUSTOMER_COLS)
        .eq('merchant_id', merchantId).eq('segment', 'new')
        .gte('first_purchase_at', ago14).eq('total_orders', 1)
        .not('email', 'is', null).eq('control_group', false)
      return data ?? []
    },
  },
  vip_reward: {
    label: 'vip_reward', contactCutoffDays: 90,
    buildQuery: async (service, merchantId) => {
      const { data } = await service.from('customers').select(CUSTOMER_COLS)
        .eq('merchant_id', merchantId).eq('segment', 'loyal')
        .not('email', 'is', null).eq('control_group', false)
      return data ?? []
    },
  },
  birthday: {
    label: 'birthday', contactCutoffDays: 90,
    buildQuery: async (service, merchantId, now) => {
      const { data } = await service.from('customers').select(CUSTOMER_COLS)
        .eq('merchant_id', merchantId).not('birthday', 'is', null)
        .not('email', 'is', null).eq('control_group', false)
      return (data ?? []).filter(c => isBirthdayWindow(c.birthday, now))
    },
  },
  cross_sell: {
    label: 'cross_sell', contactCutoffDays: 60,
    buildQuery: async (service, merchantId) => {
      const { data } = await service.from('customers').select(CUSTOMER_COLS)
        .eq('merchant_id', merchantId).in('segment', ['active', 'loyal'])
        .not('email', 'is', null).eq('control_group', false)
      return (data ?? []).filter(c => c.favorite_items?.length > 0)
    },
  },
}

/** Maps a dashboard agent id to the campaign trigger it executes. */
export const AGENT_TRIGGER: Record<string, TriggerType> = {
  winback:     'win_back',
  flash:       'win_back',   // flash offer = urgent win-back to at-risk/lapsed
  newcustomer: 'new_customer',
  vip:         'vip_reward',
  birthday:    'birthday',
  crosssell:   'cross_sell',
}

/**
 * Build + send a campaign for one trigger, right now. Returns how many were
 * sent and the revenue Yara estimates it will recover.
 */
export async function executeTrigger(merchantId: string, trigger: TriggerType): Promise<TriggerResult> {
  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, industry, credit_balance, plan')
    .eq('id', merchantId)
    .single()
  if (!merchant) return { ok: false, error: 'No merchant' }
  if ((merchant.credit_balance ?? 0) < CREDIT_COSTS.email_sent) return { ok: false, error: 'insufficient_credits' }

  const cfg = TRIGGER_CONFIGS[trigger]
  if (!cfg) return { ok: false, error: 'unknown_trigger' }

  const now = new Date()
  const contactCutoff = new Date(now.getTime() - cfg.contactCutoffDays * 86400000).toISOString()
  const result = await runTrigger({ service, merchant, now, trigger, label: cfg.label, buildQuery: () => cfg.buildQuery(service, merchant.id, now), contactCutoff })
  return result
}

async function runTrigger({
  service, merchant, now, trigger, label, buildQuery, contactCutoff, contextSnapshot,
}: {
  service:          ReturnType<typeof createServiceClient>
  merchant:         any
  now:              Date
  trigger:          TriggerType
  label:            string
  buildQuery:       () => Promise<any[]>
  contactCutoff:    string
  contextSnapshot?: ContextSnapshot
}): Promise<TriggerResult> {
  try {
    const candidates = await buildQuery()
    if (!candidates.length) return { ok: true, sent: 0, reason: 'no_candidates' }

    const { data: recentSends } = await service
      .from('campaign_sends').select('customer_id')
      .eq('merchant_id', merchant.id).gte('sent_at', contactCutoff)
    const recentIds = new Set((recentSends ?? []).map((s: any) => s.customer_id))
    const targets   = candidates.filter(c => !recentIds.has(c.id))
    if (!targets.length) return { ok: true, sent: 0, reason: 'all_contacted_recently' }

    const { data: campaign } = await service
      .from('campaigns')
      .insert({
        merchant_id:     merchant.id,
        name:            `Yara ${label.replace('_', '-')} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        subject:         `Yara ${label}`,
        body_html:       '',
        segment_targets: segmentsForTrigger(trigger),
        status:          'sending',
        trigger_type:    label,
      })
      .select().single()
    if (!campaign) return { ok: false, error: 'Failed to create campaign' }

    await deductCampaignFee(merchant.id, label, campaign.id)

    let sent = 0, skipped = 0, estRevenue = 0

    for (const customer of targets) {
      if ((merchant.credit_balance ?? 0) < CREDIT_COSTS.email_sent) break

      const compliance = await preCheckCompliance({ merchantId: merchant.id, customerId: customer.id, channel: 'email' })
      if (!compliance.allowed) { skipped++; continue }

      const firstName = (customer.name || '').split(' ')[0] || 'there'
      const daysSince = customer.last_purchase_at
        ? Math.floor((now.getTime() - new Date(customer.last_purchase_at).getTime()) / 86400000)
        : 90

      let emailSubject: string, emailBodyHtml: string
      try {
        const yara = await generateYaraCopy(
          trigger,
          { firstName, totalOrders: customer.total_orders ?? 0, lifetimeValue: parseFloat(customer.lifetime_value ?? '0'),
            avgOrderValue: parseFloat(customer.avg_order_value ?? '0'), daysSinceLastVisit: daysSince,
            favoriteItems: customer.favorite_items ?? [], segment: customer.segment ?? 'unknown', birthday: customer.birthday ?? undefined },
          { businessName: merchant.business_name, industry: merchant.industry ?? undefined },
          undefined, contextSnapshot,
        )
        emailSubject = yara.emailSubject; emailBodyHtml = yara.emailBodyHtml
      } catch {
        emailSubject = `${firstName}, a message from ${merchant.business_name}`
        emailBodyHtml = `<p>Hey ${firstName}, we wanted to reach out personally. We appreciate you and hope to see you again soon.</p>`
      }

      try {
        await sendWinBackEmail({ to: customer.email, customerName: customer.name || '', businessName: merchant.business_name, subject: emailSubject, bodyHtml: emailBodyHtml })
        await service.from('campaign_sends').insert({ campaign_id: campaign.id, merchant_id: merchant.id, customer_id: customer.id, email: customer.email, is_control_group: false, sent_at: now.toISOString() })
        await deductCredits(merchant.id, 'email_sent', `${label}: ${campaign.id}`, campaign.id)
        await recordMessageSent(customer.id, 'email')
        logCampaignSent({ merchantId: merchant.id, customerId: customer.id, channel: 'email', triggerType: trigger, campaignId: campaign.id }).catch(() => {})
        merchant.credit_balance = (merchant.credit_balance ?? 0) - CREDIT_COSTS.email_sent
        estRevenue += parseFloat(customer.avg_order_value ?? '0') || 0
        sent++
      } catch {
        skipped++
      }
    }

    await service.from('campaigns').update({ status: 'sent', total_sent: sent, sent_at: now.toISOString(), updated_at: now.toISOString() }).eq('id', campaign.id)
    return { ok: true, sent, skipped, estRevenue: Math.round(estRevenue), campaignId: campaign.id }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'send_failed' }
  }
}
