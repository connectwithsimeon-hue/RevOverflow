/**
 * Stage 2 — Revenue Forecasting
 *
 * Yara predicts next 30-day revenue for a merchant based on:
 *   1. Baseline: current monthly revenue run rate
 *   2. Win-back uplift: at_risk + lapsed × avg_order_value × industry conversion rate
 *   3. New customer uplift: new segment × repeat visit probability
 *   4. VIP uplift: loyal segment × cross-sell probability
 *
 * Confidence is low when < 60 days of data, medium at 60-90 days, high after 90.
 */

import { createServiceClient } from '@/lib/supabase/server'

export interface RevenueForecast {
  baselineRevenue: number        // Current month run rate (annualised ÷ 12)
  upliftFromWinBack: number      // Expected additional revenue from win-back campaigns
  upliftFromNewCustomers: number // Expected from locking in visit #2 for new customers
  upliftFromVip: number          // Expected from VIP cross-sell
  totalForecast: number          // baseline + all uplifts
  confidenceLevel: 'low' | 'medium' | 'high'
  daysOfData: number
  assumptions: {
    winBackConversionRate: number
    newCustomerRepeatRate: number
    avgOrderValue: number
    atRiskCount: number
    newCount: number
    loyalCount: number
  }
}

export async function computeRevenueForecast(merchantId: string): Promise<RevenueForecast> {
  const service = createServiceClient()

  // ── 1. Get merchant data ────────────────────────────────────────────────
  const { data: merchant } = await service
    .from('merchants')
    .select('created_at, industry')
    .eq('id', merchantId)
    .single()

  const daysOfData = merchant
    ? Math.floor((Date.now() - new Date(merchant.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // ── 2. Current monthly revenue (last 30 days) ───────────────────────────
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentOrders } = await service
    .from('orders')
    .select('total_amount')
    .eq('merchant_id', merchantId)
    .gte('ordered_at', since30d)

  const baselineRevenue = (recentOrders ?? []).reduce(
    (sum, o) => sum + parseFloat(String(o.total_amount ?? 0)), 0
  )

  // ── 3. Average order value ──────────────────────────────────────────────
  const { data: allOrders } = await service
    .from('orders')
    .select('total_amount')
    .eq('merchant_id', merchantId)

  const avgOrderValue = allOrders && allOrders.length > 0
    ? allOrders.reduce((s, o) => s + parseFloat(String(o.total_amount ?? 0)), 0) / allOrders.length
    : 35  // fallback industry average

  // ── 4. Segment counts ───────────────────────────────────────────────────
  const { data: segRows } = await service
    .from('customers')
    .select('segment')
    .eq('merchant_id', merchantId)

  const counts: Record<string, number> = {}
  for (const r of segRows ?? []) {
    if (r.segment) counts[r.segment] = (counts[r.segment] ?? 0) + 1
  }

  const atRiskCount = (counts['at_risk'] ?? 0) + (counts['lapsed'] ?? 0)
  const newCount    = counts['new'] ?? 0
  const loyalCount  = counts['loyal'] ?? 0

  // ── 5. Conversion rates (industry defaults; L2 benchmarks refine these) ─
  // These are conservative: real numbers improve as outcome_log fills up
  const winBackConversionRate   = 0.08  // 8% of at-risk/lapsed come back after a nudge
  const newCustomerRepeatRate   = 0.25  // 25% of new customers return when messaged within 14 days
  const vipCrossellRate         = 0.12  // 12% of loyal customers respond to a cross-sell

  // ── 6. Uplift calculations ──────────────────────────────────────────────
  const upliftFromWinBack       = atRiskCount * winBackConversionRate * avgOrderValue
  const upliftFromNewCustomers  = newCount    * newCustomerRepeatRate  * avgOrderValue
  const upliftFromVip           = loyalCount  * vipCrossellRate        * avgOrderValue

  const totalForecast = baselineRevenue + upliftFromWinBack + upliftFromNewCustomers + upliftFromVip

  // ── 7. Confidence ───────────────────────────────────────────────────────
  const confidenceLevel: 'low' | 'medium' | 'high' =
    daysOfData < 60  ? 'low'    :
    daysOfData < 90  ? 'medium' : 'high'

  return {
    baselineRevenue,
    upliftFromWinBack,
    upliftFromNewCustomers,
    upliftFromVip,
    totalForecast,
    confidenceLevel,
    daysOfData,
    assumptions: {
      winBackConversionRate,
      newCustomerRepeatRate,
      avgOrderValue,
      atRiskCount,
      newCount,
      loyalCount,
    },
  }
}
