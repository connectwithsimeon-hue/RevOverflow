/**
 * Loyalty Agent
 *
 * Goal: increase repeat behavior with a simple "earn a reward every N visits"
 * program that RevOverflow runs itself off visit counts (no Square Loyalty
 * needed). When the merchant has defined a program, Yara uses its reward +
 * threshold, nudges customers who are close, and invites those who just earned
 * one to come claim it. When there's no program yet, Yara prompts to create one.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'

const NEAR_WINDOW = 2 // within this many visits of the next reward

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

  const program = ctx.loyalty

  // ── No program defined yet → prompt to create one ─────────────────────────
  if (!program) {
    const repeatCustomers = ctx.customers.filter((c) => c.total_orders >= 3 && c.is_reachable)
    if (repeatCustomers.length < 5) {
      return {
        ...base,
        status: 'active' as const,
        statusLabel: 'Watching',
        headline: 'Not enough repeat customers yet for a loyalty program to pay off.',
        recommendations: [],
      }
    }
    return {
      ...base,
      status: 'active',
      statusLabel: 'Ready to set up',
      headline: `${repeatCustomers.length} repeat customers could be driven back by a rewards program.`,
      recommendations: [
        {
          title: 'Set up a loyalty program',
          detail: `Pick a reward (e.g. "free wash every 10 visits") and Yara will track every customer's visits and nudge the ${repeatCustomers.length} repeat customers who are close — bringing them back to earn it. No Square Loyalty needed.`,
          cta: { label: 'Create loyalty program', href: '/dashboard/loyalty' },
        },
      ],
    }
  }

  const threshold = program.visitsRequired
  const reward = program.rewardName

  // Customers within NEAR_WINDOW visits of their next reward.
  const nearReward = ctx.customers.filter((c) => {
    if (c.total_orders <= 0 || !c.is_reachable) return false
    const remaining = threshold - (c.total_orders % threshold)
    return remaining > 0 && remaining <= NEAR_WINDOW
  })

  // Customers who just earned a reward (visits land exactly on a multiple).
  const earned = ctx.customers.filter(
    (c) => c.total_orders > 0 && c.is_reachable && c.total_orders % threshold === 0,
  )

  const recs: AgentRecommendation[] = []
  if (earned.length > 0) {
    recs.push({
      title: `Invite ${earned.length} customers to claim their ${reward}`,
      detail: `${earned.length} customers have hit ${threshold} visits and earned a ${reward}. A "you've earned it — come claim it" message is a near-guaranteed visit.`,
      cta: { label: 'Send reward invite', href: '/campaigns' },
    })
  }
  if (nearReward.length > 0) {
    recs.push({
      title: `Nudge ${nearReward.length} customers who are almost there`,
      detail: `${nearReward.length} customers are within ${NEAR_WINDOW} visits of their ${reward}. A "you're almost there" message reliably pulls forward their next visit.`,
      cta: { label: 'Create loyalty nudge', href: '/campaigns' },
    })
  }

  if (recs.length === 0) {
    return {
      ...base,
      status: 'active',
      statusLabel: 'Watching',
      headline: `Your ${reward} program is live — no one is close to a reward right now.`,
      recommendations: [],
    }
  }

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline:
      earned.length > 0
        ? `${earned.length} customers have earned a ${reward} — invite them back to claim it.`
        : `${nearReward.length} customers are close to earning a ${reward}.`,
    recommendations: recs,
  }
}
