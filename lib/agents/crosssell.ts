/**
 * Cross-Sell Agent
 *
 * Grows average order value by encouraging active customers to try something
 * new. Targets recently-active, reachable customers and (when line-item data
 * exists) leans on the merchant's most popular category as the thing to suggest.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money } from './types'

const CONVERSION = 0.1
const UPLIFT = 0.25  // cross-sell adds ~25% to the order it lands on

export function crosssellAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'crosssell',
    name: 'Cross-Sell Agent',
    icon: '🛍️',
    tagline: 'Grows order size by suggesting the right add-on.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS to find cross-sell opportunities.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your customers.',
    }
  }

  const targets = ctx.customers.filter(
    (c) => (c.segment === 'active' || c.segment === 'loyal') && c.total_orders >= 2 && c.is_reachable,
  )

  if (targets.length === 0) {
    return {
      ...base,
      status: 'active' as const,
      statusLabel: 'Watching',
      headline: 'No strong cross-sell targets right now.',
      recommendations: [],
    }
  }

  // Most popular category (if line items synced) to anchor the suggestion.
  let topCategory: string | null = null
  if (ctx.orderItems.length > 0) {
    const byCat = new Map<string, number>()
    for (const it of ctx.orderItems) {
      const cat = it.category?.trim()
      if (cat) byCat.set(cat, (byCat.get(cat) ?? 0) + it.quantity)
    }
    const ranked = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])
    topCategory = ranked[0]?.[0] ?? null
  }

  const avgOrder = targets.reduce((s, c) => s + c.avg_order_value, 0) / targets.length || 0
  const upside = Math.round(targets.length * avgOrder * UPLIFT * CONVERSION)

  const recs: AgentRecommendation[] = [
    {
      title: `Cross-sell ${targets.length} active customers`,
      detail: `${targets.length} active customers are reachable${
        topCategory ? `, and "${topCategory}" is your most popular category to suggest` : ''
      }. A well-timed add-on offer lifts order size by roughly ${Math.round(
        UPLIFT * 100,
      )}% on the orders it lands — about ${money(upside)} in extra revenue this month.`,
      estimatedRevenue: upside,
      cta: { label: 'Plan a cross-sell', href: '/campaigns' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: `${targets.length} active customers are ready for a cross-sell.`,
    recommendations: recs,
  }
}
