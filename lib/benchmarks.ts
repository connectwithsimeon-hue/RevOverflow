/**
 * Learning Loop L2 — Pattern Recognition & Per-Industry Benchmarks
 *
 * Reads outcome_log across all merchants in the same industry to build
 * benchmarks: which triggers convert best, average ROI per trigger,
 * best-performing send time, etc.
 *
 * These benchmarks are used by:
 *   - The cron job (prioritise the highest-ROI trigger first)
 *   - The recommendation engine (S-33)
 *   - The dashboard insights panel
 */

import { createServiceClient } from '@/lib/supabase/server'
import type { TriggerType } from '@/lib/outcome'

export interface TriggerBenchmark {
  trigger: TriggerType
  sendCount: number          // total sends logged
  attributedRevenue: number  // total revenue attributed to this trigger
  conversionRate: number     // attributed / sent (0–1)
  avgRevenuePerSend: number  // attributedRevenue / sendCount
  rank: number               // 1 = best
}

export interface IndustryBenchmarks {
  industry: string | null
  merchantCount: number
  triggerBenchmarks: TriggerBenchmark[]
  bestTrigger: TriggerType | null
  avgRoiMultiple: number
  computedAt: string
}

/**
 * Compute benchmarks for a specific industry (or cross-industry if industry is null).
 * Looks back over the last 90 days.
 */
export async function computeIndustryBenchmarks(industry: string | null): Promise<IndustryBenchmarks> {
  const service = createServiceClient()

  const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  // Get all merchant IDs in this industry
  let merchantQuery = service
    .from('merchants')
    .select('id')
    .not('square_merchant_id', 'is', null)  // only active merchants

  if (industry) {
    merchantQuery = merchantQuery.eq('industry', industry)
  }

  const { data: merchants } = await merchantQuery
  const merchantIds = (merchants ?? []).map(m => m.id)
  const merchantCount = merchantIds.length

  if (merchantCount === 0) {
    return {
      industry,
      merchantCount: 0,
      triggerBenchmarks: [],
      bestTrigger: null,
      avgRoiMultiple: 0,
      computedAt: new Date().toISOString(),
    }
  }

  // Pull all campaign_sent and revenue_attributed events for these merchants
  const { data: sends } = await service
    .from('outcome_log')
    .select('trigger_type, merchant_id')
    .eq('action_type', 'campaign_sent')
    .in('merchant_id', merchantIds)
    .not('trigger_type', 'is', null)
    .gte('created_at', since90d)

  const { data: revenues } = await service
    .from('outcome_log')
    .select('trigger_type, revenue_amount, merchant_id')
    .eq('action_type', 'revenue_attributed')
    .in('merchant_id', merchantIds)
    .not('trigger_type', 'is', null)
    .gte('created_at', since90d)

  // Aggregate by trigger
  const sendCounts: Record<string, number> = {}
  const revenueTotals: Record<string, number> = {}

  for (const s of sends ?? []) {
    const t = s.trigger_type as string
    sendCounts[t] = (sendCounts[t] ?? 0) + 1
  }

  for (const r of revenues ?? []) {
    const t = r.trigger_type as string
    revenueTotals[t] = (revenueTotals[t] ?? 0) + parseFloat(String(r.revenue_amount ?? 0))
  }

  const triggers: TriggerType[] = ['win_back', 'new_customer', 'vip_reward', 'birthday', 'cross_sell']

  const triggerBenchmarks: TriggerBenchmark[] = triggers
    .map(trigger => {
      const sendCount = sendCounts[trigger] ?? 0
      const attributedRevenue = revenueTotals[trigger] ?? 0
      const conversionRate = sendCount > 0 ? Math.min(1, attributedRevenue / (sendCount * 25)) : 0
      const avgRevenuePerSend = sendCount > 0 ? attributedRevenue / sendCount : 0
      return { trigger, sendCount, attributedRevenue, conversionRate, avgRevenuePerSend, rank: 0 }
    })
    .sort((a, b) => b.avgRevenuePerSend - a.avgRevenuePerSend)
    .map((b, i) => ({ ...b, rank: i + 1 }))

  const bestTrigger = triggerBenchmarks[0]?.sendCount > 0
    ? triggerBenchmarks[0].trigger
    : 'win_back'  // default

  // Average ROI multiple across merchants in this industry
  const { data: guaranteeRows } = await service
    .from('outcome_log')
    .select('revenue_amount, merchant_id')
    .eq('action_type', 'revenue_attributed')
    .in('merchant_id', merchantIds)
    .gte('created_at', since90d)

  const totalRevenue = (guaranteeRows ?? []).reduce((s, r) => s + parseFloat(String(r.revenue_amount ?? 0)), 0)
  const avgRoiMultiple = merchantCount > 0 ? totalRevenue / merchantCount / 297 : 0   // vs Core plan cost as baseline

  return {
    industry,
    merchantCount,
    triggerBenchmarks,
    bestTrigger,
    avgRoiMultiple,
    computedAt: new Date().toISOString(),
  }
}

/**
 * For a specific merchant: get the best trigger for their industry,
 * plus whether they're above or below the industry average ROI.
 */
export async function getMerchantBenchmarkContext(merchantId: string): Promise<{
  merchantRoi: number
  industryAvgRoi: number
  bestTriggerForIndustry: TriggerType
  aboveAverage: boolean
}> {
  const service = createServiceClient()

  const { data: merchant } = await service
    .from('merchants')
    .select('industry, plan, created_at')
    .eq('id', merchantId)
    .single()

  const industry = merchant?.industry ?? null

  const [benchmarks, merchantRevRows] = await Promise.all([
    computeIndustryBenchmarks(industry),
    service
      .from('outcome_log')
      .select('revenue_amount')
      .eq('merchant_id', merchantId)
      .eq('action_type', 'revenue_attributed'),
  ])

  const { PLAN_MONTHLY_COST } = await import('@/lib/guarantee')
  const planCost = PLAN_MONTHLY_COST[merchant?.plan ?? 'core'] ?? 297
  const merchantRevenue = (merchantRevRows.data ?? []).reduce((s, r) => s + parseFloat(String(r.revenue_amount ?? 0)), 0)
  const merchantRoi = planCost > 0 ? merchantRevenue / planCost : 0

  return {
    merchantRoi,
    industryAvgRoi: benchmarks.avgRoiMultiple,
    bestTriggerForIndustry: benchmarks.bestTrigger ?? 'win_back',
    aboveAverage: merchantRoi >= benchmarks.avgRoiMultiple,
  }
}
