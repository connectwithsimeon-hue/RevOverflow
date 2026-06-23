/**
 * Win-Back Agent (Reactivation)
 *
 * Yara's flagship revenue driver: brings back customers who have stopped
 * coming. Reads the lapsed + at-risk segments straight from RFV scoring and
 * sizes the recovery opportunity. Execution runs through the existing campaign
 * engine (/campaigns), which already handles control groups and attribution.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money } from './types'

const CONVERSION = 0.15  // conservative win-back response rate

export function winbackAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'winback',
    name: 'Win-Back Agent',
    icon: '🔁',
    tagline: 'Brings back customers who stopped coming in.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS to find customers who drifted away.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your customers.',
    }
  }

  const slipping = ctx.customers.filter(
    (c) => (c.segment === 'lapsed' || c.segment === 'at_risk') && c.is_reachable,
  )

  if (slipping.length === 0) {
    return {
      ...base,
      status: 'active' as const,
      statusLabel: 'All healthy',
      headline: 'No customers are slipping away right now — nicely done.',
      recommendations: [],
    }
  }

  const avgOrder =
    slipping.reduce((s, c) => s + c.avg_order_value, 0) / slipping.length || 0
  const upside = Math.round(slipping.length * avgOrder * CONVERSION)

  const recs: AgentRecommendation[] = [
    {
      title: `Win back ${slipping.length} slipping customers`,
      detail: `${slipping.length} reachable customers are lapsed or at risk. A personalized win-back offer typically recovers around ${Math.round(
        CONVERSION * 100,
      )}% of them — about ${money(upside)} in recovered revenue this month.`,
      estimatedRevenue: upside,
      cta: { label: 'Launch win-back', href: '/campaigns' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: `${slipping.length} customers are slipping away — ${money(upside)} recoverable.`,
    recommendations: recs,
  }
}
