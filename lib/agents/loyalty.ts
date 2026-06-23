/**
 * Loyalty Agent
 *
 * Goal: increase repeat behavior. From Square order frequency it finds the
 * customers who are CLOSE to a natural reward threshold and recommends a nudge
 * to get them over it. Deeper optimization (points balances, redemption rates)
 * needs Square Loyalty data, reported as the next source to connect.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'

const REWARD_THRESHOLD = 10   // visits to "earn" a reward
const NEAR_WINDOW = 2         // within this many visits of the threshold

export function loyaltyAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'loyalty',
    name: 'Loyalty Agent',
    icon: '💎',
    tagline: 'Nudges customers toward their next reward to drive repeat visits.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS to see who is close to a reward.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your customers.',
    }
  }

  // Customers within NEAR_WINDOW visits of the reward threshold.
  const nearReward = ctx.customers.filter((c) => {
    const remaining = REWARD_THRESHOLD - (c.total_orders % REWARD_THRESHOLD)
    return c.total_orders > 0 && remaining > 0 && remaining <= NEAR_WINDOW && c.is_reachable
  })

  if (nearReward.length === 0) {
    return {
      ...base,
      status: 'active' as const,
      statusLabel: 'Watching',
      headline: 'No customers near a reward threshold right now.',
      recommendations: [],
      dataNeeded: 'Connect Square Loyalty to use real points balances and redemption history.',
    }
  }

  const recs: AgentRecommendation[] = [
    {
      title: `Nudge ${nearReward.length} customers toward a reward`,
      detail: `${nearReward.length} customers are within ${NEAR_WINDOW} visits of a ${REWARD_THRESHOLD}-visit reward. A "you're almost there" message is one of the most reliable ways to pull forward their next visit.`,
      cta: { label: 'Create loyalty nudge', href: '/campaigns' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: `${nearReward.length} customers are one or two visits from a reward.`,
    recommendations: recs,
    dataNeeded: 'Connect Square Loyalty for real points balances and redemption optimization.',
  }
}
