/**
 * New Customer Agent (Welcome)
 *
 * The second visit is the hardest and the most important — customers who come
 * back once are far more likely to become regulars. This agent finds new
 * customers and recommends a welcome offer to lock in that crucial 2nd visit.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money } from './types'

const CONVERSION = 0.2

export function newCustomerAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'newcustomer',
    name: 'New Customer Agent',
    icon: '👋',
    tagline: 'Turns first-timers into repeat regulars.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS to welcome your new customers.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your customers.',
    }
  }

  const newcomers = ctx.customers.filter((c) => c.segment === 'new' && c.is_reachable)

  if (newcomers.length === 0) {
    return {
      ...base,
      status: 'active' as const,
      statusLabel: 'Watching',
      headline: 'No new customers to welcome right now.',
      recommendations: [],
    }
  }

  const avgOrder = newcomers.reduce((s, c) => s + c.avg_order_value, 0) / newcomers.length || 0
  const upside = Math.round(newcomers.length * avgOrder * CONVERSION)

  const recs: AgentRecommendation[] = [
    {
      title: `Welcome ${newcomers.length} new customers`,
      detail: `${newcomers.length} reachable customers just made their first purchase. A welcome offer to pull them back for a 2nd visit is the single biggest lever on lifetime value — about ${money(
        upside,
      )} in near-term revenue, and far more over time.`,
      estimatedRevenue: upside,
      cta: { label: 'Send a welcome offer', href: '/campaigns' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: `${newcomers.length} first-timers are ready for a welcome offer.`,
    recommendations: recs,
  }
}
