/**
 * Performance Floor Guarantee System
 *
 * Spec: Mode B (Revenue Activation) merchants on Core/Brain/Empire/Network get a 3× ROI guarantee
 * in 60 days. If at day 60 revenue_recovered < 3 × monthly_plan_cost, the
 * merchant is eligible for a refund review.
 *
 * "Revenue recovered" = control-group-verified incremental revenue across
 * every campaign the merchant sent since activation. Each campaign holds out
 * a control group that never receives the message; revenueRecovered only
 * counts conversions above what that control group's own baseline rate
 * predicts. This uses the exact same math as the Campaigns page
 * (lib/attribution.ts), so the number that can trigger a refund is computed
 * identically to the number merchants already see per-campaign — no naive
 * "anyone who bought within 30 days" counting.
 */

import { createServiceClient } from '@/lib/supabase/server'
import { computeCampaignAttribution } from '@/lib/attribution'
import { isPaidPlan } from '@/lib/plans'

export const PLAN_MONTHLY_COST: Record<string, number> = {
  business:     97,
  business_pro: 297,
  custom:       997,
  // Legacy plan ids (existing accounts)
  capture: 97,
  core:    97,
  brain:   297,
  empire:  297,
  network: 997,
}

export interface GuaranteeStatus {
  eligible: boolean          // Is this merchant on a guarantee plan in Mode B (Revenue Activation)?
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
    .select('plan, created_at, square_merchant_id, clover_merchant_id, toast_restaurant_guid')
    .eq('id', merchantId)
    .single()

  if (!merchant) return null

  const plan = merchant.plan || 'business'
  const planCost = PLAN_MONTHLY_COST[plan] ?? 97
  const hasPosConnected = !!(merchant.square_merchant_id || merchant.clover_merchant_id || merchant.toast_restaurant_guid)

  // The 3x guarantee is only a fair, mathematically defensible promise once
  // Yara has enough reachable customers to actually run win-back campaigns
  // against — this mirrors the dashboard's Mode A/B threshold (1,000+
  // reachable). Below that, there isn't enough audience for 3x ROI to be a
  // reasonable floor, so the merchant isn't eligible yet regardless of plan.
  const REACHABLE_THRESHOLD = 1000
  const { count: reachableCount } = await service
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('is_reachable', true)

  const eligible = isPaidPlan(plan) && hasPosConnected && (reachableCount ?? 0) >= REACHABLE_THRESHOLD

  const startDate = new Date(merchant.created_at)
  const now = new Date()
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, 60 - daysSinceStart)

  // Control-group-verified revenue: sum the incremental (control-adjusted)
  // attributed revenue across every campaign this merchant has sent since
  // activation, using the same formula as the Campaigns page.
  const { data: campaignsSent } = await service
    .from('campaigns')
    .select('id')
    .eq('merchant_id', merchantId)
    .not('sent_at', 'is', null)
    .gte('sent_at', startDate.toISOString())

  let revenueRecovered = 0
  for (const campaign of campaignsSent ?? []) {
    const { data: sends } = await service
      .from('campaign_sends')
      .select('is_control_group, converted_at, conversion_value')
      .eq('campaign_id', campaign.id)

    const attribution = computeCampaignAttribution(sends)
    if (attribution) revenueRecovered += attribution.attributedRevenue
  }

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
