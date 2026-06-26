/**
 * Yara Credits — shared helper functions
 *
 * 1 credit ≈ 1 message. Costs (locked 2026-06):
 *   send a text or email   → 1 credit
 *   Yara builds a campaign → 10 credits  (the "brain" fee — analyze, target, write)
 *   inbound reply handled  → 2 credits
 *
 * Sold at a base of 10¢/credit (cheaper in bulk). Our cost is ~1.15¢ per text,
 * ~0.4¢ per email, and ~$0 for campaign strategy — so every credit is margin.
 *
 * Plan monthly allowances live in lib/plans.ts (the single source of truth):
 *   business → 500  |  business_pro → 1,200
 */

import { createServiceClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/plans'

export const CREDIT_COSTS = {
  email_sent:     1,   // Yara writes + sends one email
  sms_sent:       1,   // Yara writes + sends one text
  campaign:       10,  // Yara analyzes + targets + builds a campaign (brain fee)
  reply_handled:  2,   // Yara handles one inbound reply
  decision:       1,   // single targeting decision (legacy / uncharged paths)
  analysis:       10,  // deep analysis report
  extra_pos:      50,
  import_100:     5,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

export const PLAN_CREDITS: Record<string, number> = {
  business:     PLANS.business.credits,      // 500
  business_pro: PLANS.business_pro.credits,  // 1,200
  // Legacy ids → nearest current tier so old subscriptions still renew correctly
  capture: PLANS.business.credits,
  core:    PLANS.business.credits,
  brain:   PLANS.business_pro.credits,
  empire:  PLANS.business_pro.credits,
}

/** Returns the merchant's current credit balance */
export async function getBalance(merchantId: string): Promise<number> {
  const service = createServiceClient()
  const { data } = await service
    .from('merchants')
    .select('credit_balance')
    .eq('id', merchantId)
    .single()
  return data?.credit_balance ?? 0
}

/** Check whether merchant has enough credits for an action */
export async function hasCredits(merchantId: string, action: CreditAction): Promise<boolean> {
  const balance = await getBalance(merchantId)
  return balance >= CREDIT_COSTS[action]
}

/**
 * Deduct credits for an action.
 * Returns { ok, balance } — ok is false if insufficient credits.
 */
export async function deductCredits(
  merchantId: string,
  action: CreditAction,
  description: string,
  campaignId?: string
): Promise<{ ok: boolean; balance: number; error?: string }> {
  const service = createServiceClient()
  const cost    = CREDIT_COSTS[action]
  const balance = await getBalance(merchantId)

  if (balance < cost) {
    return { ok: false, balance, error: 'Insufficient credits' }
  }

  const newBalance = balance - cost

  // Insert ledger row
  await service.from('credit_ledger').insert({
    merchant_id: merchantId,
    amount:      -cost,
    action,
    description,
    campaign_id: campaignId ?? null,
  })

  // Update cached balance on merchant row
  await service
    .from('merchants')
    .update({ credit_balance: newBalance })
    .eq('id', merchantId)

  return { ok: true, balance: newBalance }
}

/**
 * Charge the one-time "campaign strategy" fee (10 credits) when an agent
 * builds and launches a campaign — the visible "Yara's brain did work" line
 * on the ledger, separate from the per-message sends. Best-effort: if the
 * merchant is short on credits the campaign still proceeds (per-message
 * checks gate actual sends), so a near-empty balance never hard-blocks Yara.
 */
export async function deductCampaignFee(
  merchantId: string,
  label: string,
  campaignId?: string
): Promise<void> {
  try {
    await deductCredits(merchantId, 'campaign', `Campaign strategy — ${label}`, campaignId)
  } catch {
    // Never let billing bookkeeping break a send.
  }
}

/**
 * Bulk deduct for sending N emails at once.
 * Inserts a single ledger row for the batch.
 */
export async function deductEmailBatch(
  merchantId: string,
  count: number,
  campaignId?: string
): Promise<{ ok: boolean; balance: number; credited: number; error?: string }> {
  const service = createServiceClient()
  const cost    = CREDIT_COSTS.email_sent * count
  const balance = await getBalance(merchantId)

  if (balance < cost) {
    // Allow sending up to as many emails as credits allow
    const affordable = Math.floor(balance / CREDIT_COSTS.email_sent)
    if (affordable === 0) return { ok: false, balance, credited: 0, error: 'No credits remaining' }

    const actualCost = affordable * CREDIT_COSTS.email_sent
    const newBalance = balance - actualCost

    await service.from('credit_ledger').insert({
      merchant_id: merchantId,
      amount:      -actualCost,
      action:      'email_sent',
      description: `${affordable} win-back emails sent (credit limit reached)`,
      campaign_id: campaignId ?? null,
    })

    await service.from('merchants').update({ credit_balance: newBalance }).eq('id', merchantId)
    return { ok: true, balance: newBalance, credited: affordable }
  }

  const newBalance = balance - cost

  await service.from('credit_ledger').insert({
    merchant_id: merchantId,
    amount:      -cost,
    action:      'email_sent',
    description: `${count} win-back emails sent`,
    campaign_id: campaignId ?? null,
  })

  await service.from('merchants').update({ credit_balance: newBalance }).eq('id', merchantId)
  return { ok: true, balance: newBalance, credited: count }
}

/**
 * Grant credits to a merchant (plan grant, pack purchase, manual top-up).
 * Returns new balance.
 */
export async function grantCredits(
  merchantId: string,
  amount: number,
  action: string,
  description: string
): Promise<number> {
  const service    = createServiceClient()
  const { data }   = await service.from('merchants').select('credit_balance').eq('id', merchantId).single()
  const newBalance = (data?.credit_balance ?? 0) + amount

  await service.from('credit_ledger').insert({
    merchant_id: merchantId,
    amount,
    action,
    description,
  })

  await service.from('merchants').update({ credit_balance: newBalance }).eq('id', merchantId)
  return newBalance
}
