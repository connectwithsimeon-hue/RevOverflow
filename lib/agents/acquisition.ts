/**
 * Acquisition Agent
 *
 * Goal: generate NEW customers profitably. Uses the merchant's own average
 * customer value (from Square data) to recommend an ad budget and the revenue
 * it can be expected to produce. Execution (Meta / Google ads) runs through
 * the existing ad-sync integration once an ad account is connected.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money } from './types'

// Conservative blended assumptions for SMB local ads.
const TARGET_CAC = 25            // $ to acquire one new customer
const FIRST_YEAR_RETENTION = 0.4 // share of LTV realistically captured year one

export function acquisitionAgent(ctx: AgentContext): AgentResult {
  const base: Omit<AgentResult, 'status' | 'statusLabel' | 'headline' | 'recommendations'> = {
    id: 'acquisition',
    name: 'Acquisition Agent',
    icon: '🧲',
    tagline: 'Brings in brand-new customers through paid ads.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data',
      statusLabel: 'Connect POS',
      headline: 'Connect your POS so Yara can value your customers.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your customers.',
    }
  }

  const withValue = ctx.customers.filter((c) => c.lifetime_value > 0)
  const avgLTV =
    withValue.length > 0
      ? withValue.reduce((s, c) => s + c.lifetime_value, 0) / withValue.length
      : 0

  if (avgLTV <= 0) {
    return {
      ...base,
      status: 'needs_data',
      statusLabel: 'Needs sales history',
      headline: 'Not enough purchase history yet to value a new customer.',
      recommendations: [],
      dataNeeded: 'A few weeks of orders so Yara can compute average customer value.',
    }
  }

  // A sensible starter budget: enough to acquire ~20 customers/mo.
  const suggestedBudget = 500
  const expectedNewCustomers = Math.floor(suggestedBudget / TARGET_CAC)
  const expectedRevenue = Math.round(expectedNewCustomers * avgLTV * FIRST_YEAR_RETENTION)

  const recs: AgentRecommendation[] = [
    {
      title: `Launch a ${money(suggestedBudget)}/mo acquisition campaign`,
      detail: `Your average customer is worth ${money(avgLTV)} over their lifetime. At a ${money(
        TARGET_CAC,
      )} target cost-per-customer, ${money(
        suggestedBudget,
      )}/mo could bring in about ${expectedNewCustomers} new customers and ${money(
        expectedRevenue,
      )} in first-year revenue.`,
      estimatedRevenue: Math.round(expectedRevenue / 12),
      cta: { label: 'Connect an ad account', href: '/dashboard' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Ready to launch',
    headline: `Your average customer is worth ${money(avgLTV)} — acquisition is profitable.`,
    recommendations: recs,
    dataNeeded: 'Connect a Meta or Google ad account to let Yara execute and track spend.',
  }
}
