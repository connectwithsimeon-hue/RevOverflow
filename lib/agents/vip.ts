/**
 * VIP Agent
 *
 * Protects and grows revenue from your best customers (the loyal segment).
 * A small reward or early-access offer to VIPs has the highest response rate
 * of any campaign, because these customers already love you.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money } from './types'

const CONVERSION = 0.3  // VIPs respond at a high rate

export function vipAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'vip',
    name: 'VIP Agent',
    icon: '👑',
    tagline: 'Keeps your best customers spending more, more often.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS to identify your VIPs.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your customers.',
    }
  }

  const vips = ctx.customers.filter((c) => c.segment === 'loyal' && c.is_reachable)

  if (vips.length === 0) {
    return {
      ...base,
      status: 'active' as const,
      statusLabel: 'Watching',
      headline: 'No loyal VIPs to reward yet — Yara will flag them as they form.',
      recommendations: [],
    }
  }

  const avgOrder = vips.reduce((s, c) => s + c.avg_order_value, 0) / vips.length || 0
  const upside = Math.round(vips.length * avgOrder * CONVERSION)

  const recs: AgentRecommendation[] = [
    {
      title: `Reward ${vips.length} VIPs`,
      detail: `${vips.length} loyal customers are reachable. A VIP perk or early-access offer pulls forward their next visit at a high response rate — about ${money(
        upside,
      )} in extra revenue this month, while deepening loyalty.`,
      estimatedRevenue: upside,
      cta: { label: 'Reward your VIPs', href: '/campaigns' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: `${vips.length} VIPs are worth ${money(upside)} in extra revenue this month.`,
    recommendations: recs,
  }
}
