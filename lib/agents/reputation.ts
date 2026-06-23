/**
 * Reputation Agent
 *
 * Goal: protect and grow local reputation, which drives new walk-in revenue.
 * The revenue-driving half — asking happy customers for reviews — works today
 * on Square data (recent high-value, reachable customers). The monitoring half
 * (reading Google/Yelp reviews) needs a reviews feed and is reported as the
 * next data source to connect.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { daysSince } from './types'

export function reputationAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'reputation',
    name: 'Reputation Agent',
    icon: '⭐',
    tagline: 'Turns happy customers into 5-star reviews and referrals.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS to find your happiest customers.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your customers.',
    }
  }

  // Happy = high RFV, bought recently, and reachable by SMS/email.
  const happy = ctx.customers.filter(
    (c) =>
      (c.rfv_score ?? 0) >= 70 &&
      daysSince(c.last_purchase_at) <= 30 &&
      c.is_reachable &&
      (c.sms_opt_in || c.email_opt_in),
  )

  if (happy.length === 0) {
    return {
      ...base,
      status: 'active' as const,
      statusLabel: 'Watching',
      headline: 'No recent happy customers to ask just yet — Yara is watching.',
      recommendations: [],
      dataNeeded: 'Connect a Google/Yelp reviews feed to also monitor incoming ratings.',
    }
  }

  const recs: AgentRecommendation[] = [
    {
      title: `Ask ${happy.length} happy customers for a review`,
      detail: `${happy.length} customers bought in the last 30 days, scored highly, and can be reached. A review-request message to them lifts your local rating — the single biggest driver of new walk-in traffic.`,
      cta: { label: 'Create review campaign', href: '/campaigns' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: `${happy.length} happy customers are ready to be asked for a review.`,
    recommendations: recs,
    dataNeeded: 'Connect a Google/Yelp reviews feed so Yara can also detect and recover unhappy customers.',
  }
}
