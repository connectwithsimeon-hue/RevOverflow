/**
 * Inventory Agent
 *
 * Goal: make smarter, margin-aware promotion decisions. From Square line items
 * it surfaces best- and slow-selling products today. The margin-protection half
 * (never discounting a low-margin item) needs product COST data, which Square
 * doesn't provide — so that part is reported as the data source to add.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money } from './types'

export function inventoryAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'inventory',
    name: 'Inventory Agent',
    icon: '📦',
    tagline: 'Promotes your winners and protects your margins.',
  }

  if (!ctx.isConnected) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS to analyze what sells.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your sales.',
    }
  }

  if (ctx.orderItems.length === 0) {
    return {
      ...base,
      status: 'needs_data' as const,
      statusLabel: 'Needs line items',
      headline: 'No itemized sales data synced yet.',
      recommendations: [],
      dataNeeded: 'Itemized order data (line items) so Yara can see product-level sales.',
    }
  }

  // Revenue by product.
  const byProduct = new Map<string, number>()
  for (const it of ctx.orderItems) {
    const name = it.catalog_name?.trim() || 'Unnamed item'
    byProduct.set(name, (byProduct.get(name) ?? 0) + it.quantity * it.unit_price)
  }
  const ranked = Array.from(byProduct.entries()).sort((a, b) => b[1] - a[1])
  const top = ranked[0]

  const recs: AgentRecommendation[] = []
  if (top) {
    recs.push({
      title: `Feature your best seller: ${top[0]}`,
      detail: `${top[0]} is your top revenue product (${money(
        top[1],
      )} in the last 180 days). Featuring it in win-back offers leans on what customers already want — higher conversion, less discounting.`,
      cta: { label: 'Build an offer around it', href: '/campaigns' },
    })
  }

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active (basic)',
    headline: top
      ? `${top[0]} is your top product — promote your proven winner.`
      : 'Yara is analyzing your product sales.',
    recommendations: recs,
    dataNeeded: 'Add product COST data to unlock margin-protected promotions (never discount a low-margin item).',
  }
}
