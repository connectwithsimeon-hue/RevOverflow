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
import { computeProductMargins } from '@/lib/margin'

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

  const margins = computeProductMargins(ctx.orderItems, ctx.productCosts)
  const top = margins[0] // already sorted by revenue desc
  const hasCosts = margins.some((m) => m.marginPct !== null)

  const recs: AgentRecommendation[] = []
  if (top) {
    const marginNote = top.marginPct !== null ? ` at a ${top.marginPct}% margin` : ''
    recs.push({
      title: `Feature your best seller: ${top.catalogName}`,
      detail: `${top.catalogName} is your top revenue product (${money(top.revenue)} in the last 180 days${marginNote}). Featuring it in win-back offers leans on what customers already want — higher conversion, less discounting.`,
      cta: { label: 'Build an offer around it', href: '/campaigns' },
    })
  }

  return {
    ...base,
    status: 'active',
    statusLabel: hasCosts ? 'Active' : 'Active (basic)',
    headline: top
      ? `${top.catalogName} is your top product — promote your proven winner.`
      : 'Yara is analyzing your product sales.',
    recommendations: recs,
    dataNeeded: hasCosts
      ? undefined
      : 'Add product COST data on the Products page to unlock margin-protected promotions.',
  }
}
