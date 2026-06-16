/**
 * Autonomous Yara — daily cron job
 *
 * Runs at 9am UTC every day (configured in vercel.json).
 * Handles all 5 triggers across all eligible merchants:
 *
 *   1. Win-back      — at_risk / lapsed not contacted in 30 days
 *   2. New customer  — first-time customers (≤14 days) to lock in visit #2
 *   3. VIP reward    — loyal top customers not thanked in 90 days
 *   4. Birthday      — customers whose birthday falls within ±3 days of today
 *   5. Cross-sell    — active customers with known favorites, not contacted in 60 days
 *
 * Every message is written personally by Yara using the customer's real data.
 * Fallback templates are used if the Anthropic API is unavailable.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWinBackEmail } from '@/lib/email'
import { sendSms } from '@/lib/sms'
import { deductCredits, CREDIT_COSTS } from '@/lib/credits'
import { generateYaraCopy, type TriggerType } from '@/lib/yara'
import { preCheckCompliance, recordMessageSent } from '@/lib/compliance'
import { logCampaignSent } from '@/lib/outcome'
import { getMerchantBenchmarkContext } from '@/lib/benchmarks'
import { checkDay60Guarantee } from '@/lib/guarantee'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service   = createServiceClient()
  const results:  any[] = []
  const now       = new Date()
  const today     = toMMDD(now)

  // Cutoff dates for each trigger
  const ago30  = daysAgo(now, 30).toISOString()
  const ago14  = daysAgo(now, 14).toISOString()
  const ago60  = daysAgo(now, 60).toISOString()
  const ago90  = daysAgo(now, 90).toISOString()

  // All merchants with auto campaigns enabled
  const { data: merchants } = await service
    .from('merchants')
    .select('id, business_name, industry, plan, credit_balance, auto_campaigns_enabled')
    .in('plan', ['brain', 'empire'])
    .eq('auto_campaigns_enabled', true)
    .eq('subscription_status', 'active')

  if (!merchants || merchants.length === 0) {
    return NextResponse.json({ ok: true, message: 'No eligible merchants', results: [] })
  }

  for (const merchant of merchants) {
    const merchantResult: any = { merchantId: merchant.id, business: merchant.business_name, triggers: {} }

    // ── Learning Loop L2: load benchmark context for this merchant ───────────
    const benchmarkCtx = await getMerchantBenchmarkContext(merchant.id).catch(() => null)
    merchantResult.bestTrigger = benchmarkCtx?.bestTriggerForIndustry ?? 'win_back'
    merchantResult.aboveAverage = benchmarkCtx?.aboveAverage ?? null

    // ── Day-60 guarantee check (runs every day, only acts at day 60) ────────
    checkDay60Guarantee(merchant.id).catch(console.error)

    // ── 1. WIN-BACK ─────────────────────────────────────────────────────────
    await runTrigger({
      service, merchant, now,
      trigger: 'win_back',
      label: 'win_back',
      buildQuery: async () => {
        const { data } = await service
          .from('customers')
          .select('id, name, email, phone, segment, control_group, total_orders, lifetime_value, avg_order_value, last_purchase_at, favorite_items, birthday, sms_opt_out')
          .eq('merchant_id', merchant.id)
          .in('segment', ['at_risk', 'lapsed'])
          .not('email', 'is', null)
          .eq('control_group', false)
        return data ?? []
      },
      contactCutoff: ago30,
    }).then(r => { merchantResult.triggers.win_back = r })

    // ── 2. NEW CUSTOMER ──────────────────────────────────────────────────────
    await runTrigger({
      service, merchant, now,
      trigger: 'new_customer',
      label: 'new_customer',
      buildQuery: async () => {
        const { data } = await service
          .from('customers')
          .select('id, name, email, phone, segment, control_group, total_orders, lifetime_value, avg_order_value, last_purchase_at, favorite_items, birthday, sms_opt_out')
          .eq('merchant_id', merchant.id)
          .eq('segment', 'new')
          .gte('first_purchase_at', ago14)    // visited within 14 days
          .eq('total_orders', 1)               // only one visit so far
          .not('email', 'is', null)
          .eq('control_group', false)
        return data ?? []
      },
      contactCutoff: ago30,
    }).then(r => { merchantResult.triggers.new_customer = r })

    // ── 3. VIP REWARD ────────────────────────────────────────────────────────
    await runTrigger({
      service, merchant, now,
      trigger: 'vip_reward',
      label: 'vip_reward',
      buildQuery: async () => {
        const { data } = await service
          .from('customers')
          .select('id, name, email, phone, segment, control_group, total_orders, lifetime_value, avg_order_value, last_purchase_at, favorite_items, birthday, sms_opt_out')
          .eq('merchant_id', merchant.id)
          .eq('segment', 'loyal')
          .not('email', 'is', null)
          .eq('control_group', false)
        return data ?? []
      },
      contactCutoff: ago90,   // VIPs get a thank-you at most every 90 days
    }).then(r => { merchantResult.triggers.vip_reward = r })

    // ── 4. BIRTHDAY ──────────────────────────────────────────────────────────
    await runTrigger({
      service, merchant, now,
      trigger: 'birthday',
      label: 'birthday',
      buildQuery: async () => {
        // Fetch customers with birthday column set, check ±3 days in JS
        const { data } = await service
          .from('customers')
          .select('id, name, email, phone, segment, control_group, total_orders, lifetime_value, avg_order_value, last_purchase_at, favorite_items, birthday, sms_opt_out')
          .eq('merchant_id', merchant.id)
          .not('birthday', 'is', null)
          .not('email', 'is', null)
          .eq('control_group', false)
        // Filter: birthday within ±3 days of today
        return (data ?? []).filter(c => isBirthdayWindow(c.birthday, now))
      },
      contactCutoff: ago90,   // Only one birthday message per year (roughly)
    }).then(r => { merchantResult.triggers.birthday = r })

    // ── 5. CROSS-SELL ────────────────────────────────────────────────────────
    await runTrigger({
      service, merchant, now,
      trigger: 'cross_sell',
      label: 'cross_sell',
      buildQuery: async () => {
        const { data } = await service
          .from('customers')
          .select('id, name, email, phone, segment, control_group, total_orders, lifetime_value, avg_order_value, last_purchase_at, favorite_items, birthday, sms_opt_out')
          .eq('merchant_id', merchant.id)
          .in('segment', ['active', 'loyal'])
          .not('email', 'is', null)
          .eq('control_group', false)
        // Only cross-sell customers who have known favorites
        return (data ?? []).filter(c => c.favorite_items?.length > 0)
      },
      contactCutoff: ago60,
    }).then(r => { merchantResult.triggers.cross_sell = r })

    results.push(merchantResult)
  }

  return NextResponse.json({ ok: true, ran: now.toISOString(), results })
}

// ── Core trigger runner ────────────────────────────────────────────────────────
async function runTrigger({
  service, merchant, now, trigger, label, buildQuery, contactCutoff,
}: {
  service:       ReturnType<typeof createServiceClient>
  merchant:      any
  now:           Date
  trigger:       TriggerType
  label:         string
  buildQuery:    () => Promise<any[]>
  contactCutoff: string
}): Promise<any> {

  try {
    const candidates = await buildQuery()
    if (!candidates.length) return { skipped: true, reason: 'no_candidates' }

    // Filter out customers contacted more recently than the cutoff
    const { data: recentSends } = await service
      .from('campaign_sends')
      .select('customer_id')
      .eq('merchant_id', merchant.id)
      .gte('sent_at', contactCutoff)

    const recentIds = new Set((recentSends ?? []).map((s: any) => s.customer_id))
    const targets   = candidates.filter(c => !recentIds.has(c.id))

    if (!targets.length) return { skipped: true, reason: 'all_contacted_recently' }

    // Create a campaign row for this trigger batch
    const { data: campaign } = await service
      .from('campaigns')
      .insert({
        merchant_id:     merchant.id,
        name:            `Yara ${label.replace('_', '-')} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        subject:         `Auto ${label}`,
        body_html:       '',
        segment_targets: segmentsForTrigger(trigger),
        status:          'sending',
        trigger_type:    label,
      })
      .select()
      .single()

    if (!campaign) return { error: 'Failed to create campaign' }

    let sent  = 0
    let skipped = 0

    for (const customer of targets) {
      // Credit gate per message
      if ((merchant.credit_balance ?? 0) < CREDIT_COSTS.email_sent) break

      // Compliance gate — quiet hours, rate limits, opt-out
      const compliance = await preCheckCompliance({
        merchantId: merchant.id,
        customerId: customer.id,
        channel:    'email',
      })
      if (!compliance.allowed) {
        skipped++
        continue
      }

      const firstName = (customer.name || '').split(' ')[0] || 'there'
      const daysSince = customer.last_purchase_at
        ? Math.floor((now.getTime() - new Date(customer.last_purchase_at).getTime()) / 86400000)
        : 90

      // Ask Yara for personalised copy
      let emailSubject: string
      let emailBodyHtml: string
      try {
        const yara = await generateYaraCopy(
          trigger,
          {
            firstName,
            totalOrders:       customer.total_orders ?? 0,
            lifetimeValue:     parseFloat(customer.lifetime_value ?? '0'),
            avgOrderValue:     parseFloat(customer.avg_order_value ?? '0'),
            daysSinceLastVisit: daysSince,
            favoriteItems:     customer.favorite_items ?? [],
            segment:           customer.segment ?? 'unknown',
            birthday:          customer.birthday ?? undefined,
          },
          {
            businessName: merchant.business_name,
            industry:     merchant.industry ?? undefined,
          }
        )
        emailSubject  = yara.emailSubject
        emailBodyHtml = yara.emailBodyHtml
      } catch {
        emailSubject  = `${firstName}, a message from ${merchant.business_name}`
        emailBodyHtml = `<p>Hey ${firstName}, we wanted to reach out personally. We appreciate you and hope to see you again soon.</p>`
      }

      try {
        await sendWinBackEmail({
          to:           customer.email,
          customerName: customer.name || '',
          businessName: merchant.business_name,
          subject:      emailSubject,
          bodyHtml:     emailBodyHtml,
        })

        await service.from('campaign_sends').insert({
          campaign_id:      campaign.id,
          merchant_id:      merchant.id,
          customer_id:      customer.id,
          email:            customer.email,
          is_control_group: false,
          sent_at:          now.toISOString(),
        })

        await deductCredits(merchant.id, 'email_sent', `Auto ${label}: ${campaign.id}`, campaign.id)
        await recordMessageSent(customer.id, 'email')
        logCampaignSent({ merchantId: merchant.id, customerId: customer.id, channel: 'email', triggerType: trigger, campaignId: campaign.id }).catch(() => {})
        merchant.credit_balance = (merchant.credit_balance ?? 0) - CREDIT_COSTS.email_sent
        sent++
      } catch (err: any) {
        console.error(`Auto ${label} email failed ${customer.email}:`, err?.message)
        skipped++
      }
    }

    // Mark campaign done
    await service.from('campaigns').update({
      status:     'sent',
      total_sent: sent,
      sent_at:    now.toISOString(),
      updated_at: now.toISOString(),
    }).eq('id', campaign.id)

    return { sent, skipped, campaignId: campaign.id }

  } catch (err: any) {
    console.error(`Trigger ${label} error:`, err?.message)
    return { error: err?.message }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

function toMMDD(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}-${d}`
}

/** Returns true if the customer's birthday (MM-DD) falls within ±3 days of today */
function isBirthdayWindow(birthday: string | null, now: Date): boolean {
  if (!birthday) return false
  // birthday might be MM-DD or YYYY-MM-DD
  const parts = birthday.split('-')
  const mmdd = parts.length === 3
    ? `${parts[1]}-${parts[2]}`   // YYYY-MM-DD → MM-DD
    : birthday                    // already MM-DD

  const year = now.getFullYear()
  const bDate = new Date(`${year}-${mmdd}`)
  if (isNaN(bDate.getTime())) return false

  const diffDays = Math.abs((bDate.getTime() - now.getTime()) / 86400000)
  return diffDays <= 3
}

function segmentsForTrigger(trigger: TriggerType): string[] {
  switch (trigger) {
    case 'win_back':     return ['at_risk', 'lapsed']
    case 'new_customer': return ['new']
    case 'vip_reward':   return ['loyal']
    case 'birthday':     return ['new', 'active', 'loyal', 'at_risk']
    case 'cross_sell':   return ['active', 'loyal']
  }
}
