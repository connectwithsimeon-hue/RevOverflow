/**
 * Flash Offer Agent (the goal-closer)
 *
 * This is the heart of RevOverflow's philosophy: not giveaways, but pulling
 * revenue FORWARD to hit a target. When the merchant is behind their monthly
 * revenue goal, Yara proposes a TIME-BOXED urgency offer ("30% off — today
 * only, next 2 hours") to the customers most likely to return, sized to the
 * remaining gap. The customer still pays — the discount is just the lever that
 * triggers a sale that wasn't going to happen. Control-group attribution makes
 * sure only net-new revenue counts.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money } from './types'

const FLASH_DISCOUNT = 30      // % off — the urgency lever
const FLASH_CONVERSION = 0.18  // expected response to an urgent, time-boxed offer

export function flashOfferAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'flash',
    name: 'Flash Offer Agent',
    icon: '⚡',
    tagline: 'Pulls revenue forward with time-boxed offers to hit your goal.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS so Yara can track your revenue against a goal.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, Toast, or Lightspeed and sync your sales.',
    }
  }

  // No goal set → Yara can't close a gap she doesn't know about.
  if (!ctx.goalAmount || ctx.goalAmount <= 0) {
    return {
      ...base,
      status: 'active' as const,
      statusLabel: 'Set a goal',
      headline: 'Set a revenue goal and Yara will close the gap for you.',
      recommendations: [
        {
          title: 'Set this month’s revenue goal',
          detail: 'Tell Yara how much you want to make this month. The moment you fall behind pace, she’ll propose a flash offer to pull revenue forward and get you back on track.',
          cta: { label: 'Set your goal', href: '/dashboard' },
        },
      ],
    }
  }

  const goal = ctx.goalAmount
  const made = ctx.monthRevenue
  const gap = goal - made

  if (gap <= 0) {
    return {
      ...base,
      status: 'active',
      statusLabel: 'Goal hit 🎉',
      headline: `You’ve already hit your ${money(goal)} goal this month — ${money(made)} and counting.`,
      recommendations: [],
    }
  }

  // Pace check.
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysLeft = daysInMonth - dayOfMonth
  const projected = dayOfMonth > 0 ? (made / dayOfMonth) * daysInMonth : 0
  const behind = projected < goal && dayOfMonth >= 5

  // Most-likely-to-return, reachable customers.
  const targets = ctx.customers.filter(
    (c) => (c.segment === 'lapsed' || c.segment === 'at_risk' || c.segment === 'active') && c.is_reachable,
  )

  if (!behind || targets.length === 0) {
    return {
      ...base,
      status: 'active',
      statusLabel: 'On pace',
      headline: `On pace for your ${money(goal)} goal (${money(made)} so far). Yara will act the moment you fall behind.`,
      recommendations: [],
    }
  }

  const avgOrder = targets.reduce((s, c) => s + c.avg_order_value, 0) / targets.length || 0
  const pull = Math.max(0, Math.round(Math.min(gap, targets.length * avgOrder * FLASH_CONVERSION)))

  const recs: AgentRecommendation[] = [
    {
      title: `Send a flash offer to pull ~${money(pull)} forward`,
      detail: `You’re ${money(gap)} behind your goal with ${daysLeft} day${daysLeft === 1 ? '' : 's'} left. Send “${FLASH_DISCOUNT}% off — today only, next 2 hours” to your ${targets.length} most-likely-to-return customers. They still pay ${100 - FLASH_DISCOUNT}% of a sale that wasn’t going to happen — net-new revenue straight toward your goal.`,
      estimatedRevenue: pull,
      cta: { label: 'Launch flash offer', href: '/campaigns' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Behind — act now',
    headline: `You’re ${money(gap)} behind your goal with ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.`,
    recommendations: recs,
  }
}
