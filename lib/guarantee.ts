/**
 * Performance Floor Guarantee System
 *
 * Spec: Mode A merchants on Core/Brain/Empire/Network get a 3× ROI guarantee
 * in 60 days. If at day 60 revenue_recovered < 3 × monthly_plan_cost, the
 * merchant is eligible for a refund review.
 *
 * "Revenue recovered" = sum of order revenue from customers who were in the
 * at_risk or lapsed segment when a campaign was sent to them, and who
 * subsequently placed an order within 30 days of receiving that campaign.
 *
 * This is approximated via the outcome_log: every win-back send is logged,
 * and every subsequent order from that customer is attributed.
 */

import { createServiceClient } from '@/lib/supabase/server'

export const PLAN_MONTHLY_COST: Record<string, number> = {
  capture: 97,
  core:    297,
  brain:   597,
  empire:  1197,
  network: 2997,
}

// Plans with the 3× guarantee
const GUARANTEE_PLANS = new Set(['core', 'brain', 'empire', 'network'])

export interface GuaranteeStatus {
  eligible: boolean          // Is this merchant on a guarantee plan in Mode A?
  daysSinceStart: number     // Days since merchant first activated
  revenueRecovered: number   // $ attributed revenue so far
  planCost: number           // Monthly plan cost
  targetRevenue: number      // 3 × plan cost
  roiMultiple: number        // revenueRecovered / planCost
  onTrack: boolean           // roiMultiple >= 3 OR daysSinceStart < 60
  atRisk: boolean            // daysSinceStart >= 45 AND roiMultiple < 2
  guaranteed: boolean        // daysSinceStart >= 60 AND roiMultiple < 3
  daysRemaining: number      // Days until day-60 check (0 if past)
}

export async function computeGuaranteeStatus(merchantId: string): Promise<GuaranteeStatus | null> {
  const service = createServiceClient()

  const { data: merchant } = await service
    .from('merchants')
    .select('plan, created_at, square_merchant_id')
    .eq('id', merchantId)
    .single()

  if (!merchant) return null

  const plan = merchant.plan || 'capture'
  const planCost = PLAN_MONTHLY_COST[plan] ?? 97
  const eligible = GUARANTEE_PLANS.has(plan) && !!merchant.square_merchant_id

  const startDate = new Date(merchant.created_at)
  const now = new Date()
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, 60 - daysSinceStart)

  // Sum attributed revenue from outcome_log where action_type = 'revenue_attributed'
  const { data: outcomeRows } = await service
    .from('outcome_log')
    .select('revenue_amount')
    .eq('merchant_id', merchantId)
    .eq('action_type', 'revenue_attributed')
    .gte('created_at', startDate.toISOString())

  const revenueRecovered = (outcomeRows ?? []).reduce((sum, r) => {
    return sum + parseFloat(String(r.revenue_amount ?? 0))
  }, 0)

  const targetRevenue = planCost * 3
  const roiMultiple = planCost > 0 ? revenueRecovered / planCost : 0

  const onTrack    = roiMultiple >= 3 || daysSinceStart < 60
  const atRisk     = daysSinceStart >= 45 && roiMultiple < 2
  const guaranteed = daysSinceStart >= 60 && roiMultiple < 3

  return {
    eligible,
    daysSinceStart,
    revenueRecovered,
    planCost,
    targetRevenue,
    roiMultiple,
    onTrack,
    atRisk,
    guaranteed,
    daysRemaining,
  }
}

/**
 * Called by the day-60 cron for each merchant on a guarantee plan.
 * If they missed the 3× target, logs a 'guarantee_review' outcome and
 * sets a flag so the admin panel can surface it.
 */
export async function checkDay60Guarantee(merchantId: string): Promise<void> {
  const status = await computeGuaranteeStatus(merchantId)
  if (!status || !status.eligible) return
  if (status.daysSinceStart < 60) return

  const service = createServiceClient()

  if (status.guaranteed) {
    // Log for admin review
    await service.from('outcome_log').insert({
      merchant_id:    merchantId,
      action_type:    'guarantee_review',
      channel:        'system',
      revenue_amount: status.revenueRecovered,
      metadata: {
        roi_multiple:      status.roiMultiple.toFixed(2),
        target_revenue:    status.targetRevenue,
        plan_cost:         status.planCost,
        days_since_start:  status.daysSinceStart,
      },
    })

    // Flag merchant for refund review
    await service
      .from('merchants')
      .update({ guarantee_review_due: true, guarantee_checked_at: new Date().toISOString() })
      .eq('id', merchantId)
  } else {
    // Guarantee met — mark as checked, clear any flag
    await service
      .from('merchants')
      .update({ guarantee_review_due: false, guarantee_checked_at: new Date().toISOString() })
      .eq('id', merchantId)
  }
}
