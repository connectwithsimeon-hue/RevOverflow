/**
 * Yara Credits — shared helper functions
 *
 * Credit costs (matches pricing page):
 *   email sent        → 2 credits
 *   sms sent          → 5 credits
 *   targeting decision → 1 credit
 *   campaign analysis → 10 credits
 *   extra POS / month → 50 credits
 *   inbound reply     → 3 credits
 *   import per 100    → 5 credits
 *
 * Plan monthly allowances:
 *   capture → 500  | core → 2,000 | brain → 5,000 | empire → 15,000
 */

import { createServiceClient } from '@/lib/supabase/server'

export const CREDIT_COSTS = {
  email_sent:     2,
  sms_sent:       5,
  decision:       1,
  analysis:       10,
  extra_pos:      50,
  reply_handled:  3,
  import_100:     5,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS

export const PLAN_CREDITS: Record<string, number> = {
  capture: 500,
  core:    2000,
  brain:   5000,
  empire:  15000,
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
