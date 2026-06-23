/**
 * Membership Agent
 *
 * Goal: convert frequent customers into recurring (predictable) revenue.
 * Identifies high-frequency customers from Square order history and sizes the
 * recurring revenue a membership could lock in. Fully data-ready today.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money, monthsActive } from './types'

const MEMBERSHIP_PRICE = 39      // suggested $/mo membership
const ADOPTION_RATE = 0.2        // conservative share of frequent customers who join

export function membershipAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'membership',
    name: 'Membership Agent',
    icon: '🎟️',
    tagline: 'Converts your regulars into recurring monthly revenue.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS to find your regulars.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your customers.',
    }
  }

  // Frequent = visits roughly twice a month or more, based on real history.
  const frequent = ctx.customers.filter((c) => {
    const months = monthsActive(c.first_purchase_at)
    return c.total_orders / months >= 2
  })

  if (frequent.length < 5) {
    return {
      ...base,
      status: 'active' as const,
      statusLabel: 'Watching',
      headline: 'Not enough frequent regulars yet for a membership to pay off.',
      recommendations: [],
      dataNeeded: 'A larger base of repeat customers — Yara will flag this when it is worth launching.',
    }
  }

  const adopters = Math.round(frequent.length * ADOPTION_RATE)
  const monthlyRecurring = adopters * MEMBERSHIP_PRICE

  const recs: AgentRecommendation[] = [
    {
      title: `Launch a ${money(MEMBERSHIP_PRICE)}/mo membership`,
      detail: `${frequent.length} customers already visit twice a month or more. If even ${Math.round(
        ADOPTION_RATE * 100,
      )}% join (~${adopters} members), that is ${money(
        monthlyRecurring,
      )}/mo in predictable recurring revenue — money in the bank before the month starts.`,
      estimatedRevenue: monthlyRecurring,
      cta: { label: 'Plan a membership offer', href: '/campaigns' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: `${frequent.length} regulars could become ${money(monthlyRecurring)}/mo in recurring revenue.`,
    recommendations: recs,
  }
}
