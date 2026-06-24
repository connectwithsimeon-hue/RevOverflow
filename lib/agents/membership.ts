/**
 * Membership Agent
 *
 * Goal: convert frequent customers into recurring (predictable) revenue.
 * Identifies high-frequency regulars from order history. If the merchant has
 * DEFINED a membership offer, Yara promotes it to those regulars and tracks the
 * recurring revenue. If not, Yara prompts the merchant to create one.
 *
 * RevOverflow never processes the payment — the offer's signupUrl points at the
 * merchant's own checkout (e.g. Square). This keeps RevOverflow out of payments.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money, monthsActive } from './types'

const DEFAULT_PRICE = 39      // suggested $/mo when no offer exists yet
const ADOPTION_RATE = 0.2     // conservative share of regulars who join

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

  const offer = ctx.membership

  // ── A membership offer is already defined → promote + track it ────────────
  if (offer) {
    const price = offer.monthlyPrice || DEFAULT_PRICE
    const recurringNow = offer.currentMembers * price
    const reachableRegulars = frequent.filter((c) => c.is_reachable)
    const potentialAdopters = Math.round(reachableRegulars.length * ADOPTION_RATE)
    const potentialRevenue = potentialAdopters * price

    const recs: AgentRecommendation[] = []
    if (!offer.signupUrl) {
      recs.push({
        title: 'Add your signup link to start promoting',
        detail: `Your "${offer.name}" membership is set up, but Yara needs your signup/checkout link (from Square) before she can send customers to join.`,
        cta: { label: 'Add signup link', href: '/dashboard/membership' },
      })
    } else if (potentialAdopters > 0) {
      recs.push({
        title: `Invite ${reachableRegulars.length} regulars to join ${offer.name}`,
        detail: `${reachableRegulars.length} reachable regulars visit often enough that a membership pays off for them. If ${Math.round(ADOPTION_RATE * 100)}% join (~${potentialAdopters}), that's ${money(potentialRevenue)}/mo in new recurring revenue — collected through your own checkout.`,
        estimatedRevenue: potentialRevenue,
        cta: { label: 'Launch membership campaign', href: '/campaigns' },
      })
    }

    return {
      ...base,
      status: 'active',
      statusLabel: 'Active',
      headline: recurringNow > 0
        ? `${offer.name} is generating ${money(recurringNow)}/mo from ${offer.currentMembers} members.`
        : `${offer.name} is ready — Yara can invite ${reachableRegulars.length} regulars to join.`,
      recommendations: recs,
    }
  }

  // ── No offer yet ──────────────────────────────────────────────────────────
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
  const monthlyRecurring = adopters * DEFAULT_PRICE

  return {
    ...base,
    status: 'active',
    statusLabel: 'Ready to set up',
    headline: `${frequent.length} regulars could become ${money(monthlyRecurring)}/mo in recurring revenue.`,
    recommendations: [
      {
        title: 'Set up your membership offer',
        detail: `${frequent.length} customers already visit twice a month or more. Define a membership (you keep collecting through your own checkout) and Yara will invite the regulars most likely to join — about ${money(monthlyRecurring)}/mo in predictable revenue.`,
        estimatedRevenue: monthlyRecurring,
        cta: { label: 'Create membership offer', href: '/dashboard/membership' },
      },
    ],
  }
}
