/**
 * Stage 2 — Gap Analysis + Opportunity Detection
 *
 * Compares what the merchant IS doing vs what they COULD be doing.
 * Identifies the biggest revenue opportunities and ranks them by ROI potential.
 *
 * Output feeds the Recommendation Engine (Stage 3).
 */

import { createServiceClient } from '@/lib/supabase/server'
import type { RevenueForecast } from '@/lib/forecast'

export interface Opportunity {
  id: string
  type: 'win_back' | 'new_customer' | 'vip_reward' | 'birthday' | 'cross_sell' | 'vip_growth' | 'sms_unlock'
  title: string
  description: string
  estimatedRevenue: number    // $ upside if actioned
  effort: 'instant' | 'low' | 'medium'
  urgency: 'now' | 'soon' | 'whenever'
  customerCount: number       // How many customers this affects
  actionRoute?: string        // e.g. '/campaigns' or '/api/square/offers'
  actionLabel?: string
}

export interface GapAnalysis {
  opportunities: Opportunity[]   // sorted by estimatedRevenue desc
  totalOpportunity: number       // Sum of all opportunity revenue
  topOpportunity: Opportunity | null
  computedAt: string
}

export async function computeGapAnalysis(
  merchantId: string,
  forecast: RevenueForecast
): Promise<GapAnalysis> {
  const service = createServiceClient()

  const opportunities: Opportunity[] = []

  // ── Win-back gap ────────────────────────────────────────────────────────
  if (forecast.assumptions.atRiskCount > 0 && forecast.upliftFromWinBack > 0) {
    // Check when the last win-back campaign was sent
    const { data: lastWinBack } = await service
      .from('campaigns')
      .select('sent_at')
      .eq('merchant_id', merchantId)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(1)
      .single()

    const daysSinceLastCampaign = lastWinBack?.sent_at
      ? Math.floor((Date.now() - new Date(lastWinBack.sent_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    if (daysSinceLastCampaign > 14) {
      opportunities.push({
        id: 'win_back_gap',
        type: 'win_back',
        title: `Win back ${forecast.assumptions.atRiskCount} at-risk customers`,
        description: `${forecast.assumptions.atRiskCount} customers haven't visited in a while. A personalised message from Yara could bring ${Math.round(forecast.assumptions.atRiskCount * 0.08)} back.`,
        estimatedRevenue: forecast.upliftFromWinBack,
        effort: 'instant',
        urgency: daysSinceLastCampaign > 30 ? 'now' : 'soon',
        customerCount: forecast.assumptions.atRiskCount,
        actionRoute: '/campaigns',
        actionLabel: 'Launch win-back →',
      })
    }
  }

  // ── New customer second-visit gap ───────────────────────────────────────
  if (forecast.assumptions.newCount > 0 && forecast.upliftFromNewCustomers > 0) {
    const { data: recentNewCust } = await service
      .from('outcome_log')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('trigger_type', 'new_customer')
      .eq('action_type', 'campaign_sent')
      .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1)

    if (!recentNewCust?.length) {
      opportunities.push({
        id: 'new_customer_gap',
        type: 'new_customer',
        title: `Lock in visit #2 for ${forecast.assumptions.newCount} new customers`,
        description: `First-time customers are most likely to become regulars if you reach them in the first 14 days. Yara can send a personal welcome + offer right now.`,
        estimatedRevenue: forecast.upliftFromNewCustomers,
        effort: 'instant',
        urgency: 'now',
        customerCount: forecast.assumptions.newCount,
        actionRoute: '/campaigns',
        actionLabel: 'Send welcome campaign →',
      })
    }
  }

  // ── VIP cross-sell gap ──────────────────────────────────────────────────
  if (forecast.assumptions.loyalCount >= 5 && forecast.upliftFromVip > 0) {
    opportunities.push({
      id: 'vip_cross_sell',
      type: 'vip_reward',
      title: `Reward ${forecast.assumptions.loyalCount} VIP customers`,
      description: `Your most loyal customers are ready for an exclusive offer. Yara can generate a Square discount and message them automatically.`,
      estimatedRevenue: forecast.upliftFromVip,
      effort: 'low',
      urgency: 'soon',
      customerCount: forecast.assumptions.loyalCount,
      actionRoute: '/campaigns',
      actionLabel: 'Create VIP campaign →',
    })
  }

  // ── VIP list growth gap (Mode B only) ───────────────────────────────────
  const { data: segRows } = await service
    .from('customers')
    .select('segment')
    .eq('merchant_id', merchantId)
  const totalCustomers = (segRows ?? []).length
  const reachable = (segRows ?? []).filter(r =>
    ['loyal','active','new','at_risk','lapsed'].includes(r.segment ?? '')
  ).length

  if (reachable < 1000) {
    const remaining = 1000 - reachable
    opportunities.push({
      id: 'vip_growth',
      type: 'vip_growth',
      title: `Grow your reachable list by ${remaining} to unlock Mode A`,
      description: `You need ${remaining} more reachable customers to unlock Mode A — Revenue Activation. Put your QR code at the counter or share your referral link.`,
      estimatedRevenue: remaining * forecast.assumptions.avgOrderValue * 0.5,
      effort: 'medium',
      urgency: 'soon',
      customerCount: reachable,
      actionRoute: '/account#vip',
      actionLabel: 'Get QR code →',
    })
  }

  // Sort by estimated revenue desc
  opportunities.sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)

  const totalOpportunity = opportunities.reduce((s, o) => s + o.estimatedRevenue, 0)

  return {
    opportunities,
    totalOpportunity,
    topOpportunity: opportunities[0] ?? null,
    computedAt: new Date().toISOString(),
  }
}
