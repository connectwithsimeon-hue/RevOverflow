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

  // If the merchant has linked their OWN ad account, Yara pushes a lookalike
  // audience to it and they run the ad (RevOverflow never touches ad spend).
  if (ctx.adsConnected) {
    return {
      ...base,
      status: 'active',
      statusLabel: 'Active',
      headline: `Audience synced — a ${money(suggestedBudget)}/mo campaign could add ~${expectedNewCustomers} customers.`,
      recommendations: [
        {
          title: `Run a ${money(suggestedBudget)}/mo lookalike campaign`,
          detail: `Your best-customer audience is synced to your ad account. Your average customer is worth ${money(avgLTV)}, so a ${money(suggestedBudget)}/mo budget at a ${money(TARGET_CAC)} target cost-per-customer could bring in about ${expectedNewCustomers} new customers and ${money(expectedRevenue)} in first-year revenue. You run and pay for the ad in your own account.`,
          estimatedRevenue: Math.round(expectedRevenue / 12),
          cta: { label: 'Review ad sync', href: '/account' },
        },
      ],
    }
  }

  // Not connected yet — recommend linking an ad account (no money handled).
  return {
    ...base,
    status: 'active',
    statusLabel: 'Connect ad account',
    headline: `Your average customer is worth ${money(avgLTV)} — acquisition is profitable.`,
    recommendations: [
      {
        title: 'Connect your ad account to start acquiring',
        detail: `At a ${money(TARGET_CAC)} target cost-per-customer, ${money(suggestedBudget)}/mo could add ~${expectedNewCustomers} new customers and ${money(expectedRevenue)} in first-year revenue. Link your own Meta or Google ad account and Yara syncs a lookalike of your best customers to it — you run the ad, RevOverflow never touches your ad spend.`,
        estimatedRevenue: Math.round(expectedRevenue / 12),
        cta: { label: 'Connect an ad account', href: '/account' },
      },
    ],
    dataNeeded: 'Link a Meta or Google ad account on the Account page so Yara can sync your audience.',
  }
}
