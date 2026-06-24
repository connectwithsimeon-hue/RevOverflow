/**
 * Profit Agent (Margin / Profit Engine)
 *
 * Most marketing tools chase revenue and quietly erode profit by discounting
 * whatever sells. The Profit agent makes Yara margin-aware: it promotes the
 * merchant's highest-margin products and flags the low-margin ones that should
 * never be discounted.
 *
 * Needs product COST data (entered by the merchant on the Products page), since
 * Square/Clover/Toast only provide selling price.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money } from './types'
import { computeProductMargins, classifyMargins } from '@/lib/margin'

export function profitAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'profit',
    name: 'Profit Agent',
    icon: '💰',
    tagline: 'Grows profit, not just revenue — promotes high-margin items.',
  }

  if (!ctx.isConnected || ctx.orderItems.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS so Yara can see what you sell.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync itemized sales.',
    }
  }

  const margins = computeProductMargins(ctx.orderItems, ctx.productCosts)
  const insight = classifyMargins(margins)

  // No costs entered yet → gated, with a clear CTA to the Products page.
  if (insight.withCost.length === 0) {
    return {
      ...base,
      status: 'needs_data' as const,
      statusLabel: 'Add product costs',
      headline: `Add costs for your ${margins.length} products to unlock margin-aware moves.`,
      recommendations: [
        {
          title: 'Enter your product costs',
          detail: `Square only gives Yara the selling price. Add what each product costs you (a few minutes) and Yara will start promoting your most profitable items and protecting your thin-margin ones.`,
          cta: { label: 'Add product costs', href: '/dashboard/products' },
        },
      ],
      dataNeeded: 'Product cost (COGS) data — enter it on the Products page.',
    }
  }

  const recs: AgentRecommendation[] = []

  const topMargin = insight.highMargin[0] ?? insight.withCost[0]
  if (topMargin && topMargin.marginPct !== null) {
    recs.push({
      title: `Promote your most profitable item: ${topMargin.catalogName}`,
      detail: `${topMargin.catalogName} runs a ${topMargin.marginPct}% margin — among your best. Featuring it in campaigns grows profit faster than pushing whatever happens to sell.`,
      estimatedRevenue: topMargin.grossProfit ?? undefined,
      cta: { label: 'Build an offer around it', href: '/campaigns' },
    })
  }

  if (insight.lowMargin.length > 0) {
    const names = insight.lowMargin.slice(0, 3).map((p) => p.catalogName).join(', ')
    recs.push({
      title: `Protect ${insight.lowMargin.length} low-margin item${insight.lowMargin.length > 1 ? 's' : ''}`,
      detail: `${names}${insight.lowMargin.length > 3 ? ' and more' : ''} run thin margins. Yara will avoid discounting these so promotions don't quietly cost you money.`,
      cta: { label: 'Review product margins', href: '/dashboard/products' },
    })
  }

  const blended = insight.blendedMarginPct
  const missing = insight.unknownCount > 0 ? ` (${insight.unknownCount} product${insight.unknownCount > 1 ? 's' : ''} still need a cost)` : ''

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: blended !== null
      ? `Your blended margin is ${blended}% — Yara is steering promotions to protect it${missing}.`
      : `Yara is now margin-aware${missing}.`,
    recommendations: recs,
    dataNeeded: insight.unknownCount > 0 ? 'Add costs for the remaining products for full coverage.' : undefined,
  }
}
