/**
 * Goal Mode — Stage 4
 *
 * Merchants set a monthly revenue goal. Yara builds and executes
 * an autonomous campaign plan to hit it, adjusting weekly based on
 * actual outcome_log results.
 *
 * Data model (stored in merchants table):
 *   goal_amount           NUMERIC       — target monthly revenue ($)
 *   goal_set_at           TIMESTAMPTZ   — when the goal was set
 *   goal_month            TEXT          — "2026-06" (current goal period)
 *   goal_status           TEXT          — 'on_track' | 'at_risk' | 'achieved' | null
 *
 * This file provides:
 *   computeGoalProgress()  — current progress toward the goal
 *   buildGoalPlan()        — ordered list of campaign actions to hit the goal
 *   evaluateGoalWeekly()   — called by cron, updates goal_status
 */

import { createServiceClient } from '@/lib/supabase/server'
import type { RevenueForecast } from '@/lib/forecast'
import type { GapAnalysis } from '@/lib/gap-analysis'

export interface GoalProgress {
  goalAmount: number         // e.g. 5000
  goalMonth: string          // e.g. "2026-06"
  revenueToDate: number      // actual revenue this month from orders
  revenueAttributed: number  // Yara-attributed revenue from outcome_log
  percentToGoal: number      // 0-100+
  daysLeft: number
  status: 'on_track' | 'at_risk' | 'achieved' | 'no_goal'
  projectedEndOfMonth: number
  weeklyRunRate: number
  plan: GoalAction[]
}

export interface GoalAction {
  week: number               // 1-4 (week of the month)
  trigger: string            // e.g. 'win_back'
  description: string
  estimatedRevenue: number
  status: 'pending' | 'executing' | 'done'
}

export async function computeGoalProgress(merchantId: string): Promise<GoalProgress> {
  const service = createServiceClient()

  const { data: merchant } = await service
    .from('merchants')
    .select('goal_amount, goal_set_at, goal_month, goal_status')
    .eq('id', merchantId)
    .single()

  const goalAmount = parseFloat(merchant?.goal_amount ?? '0')
  if (!goalAmount) {
    return {
      goalAmount: 0, goalMonth: '', revenueToDate: 0, revenueAttributed: 0,
      percentToGoal: 0, daysLeft: 0, status: 'no_goal',
      projectedEndOfMonth: 0, weeklyRunRate: 0, plan: [],
    }
  }

  const now = new Date()
  const goalMonth = merchant?.goal_month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [year, month] = goalMonth.split('-').map(Number)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd   = new Date(year, month, 0, 23, 59, 59)
  const daysLeft   = Math.max(0, Math.ceil((monthEnd.getTime() - now.getTime()) / 86400000))
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - monthStart.getTime()) / 86400000))

  // Actual revenue from orders this month
  const { data: orderRows } = await service
    .from('orders')
    .select('total_amount')
    .eq('merchant_id', merchantId)
    .gte('ordered_at', monthStart.toISOString())
    .lte('ordered_at', monthEnd.toISOString())

  const revenueToDate = (orderRows ?? []).reduce((s, r) => s + parseFloat(r.total_amount ?? '0'), 0)

  // Yara-attributed revenue (subset of above — from campaigns)
  const { data: attrRows } = await service
    .from('outcome_log')
    .select('metadata')
    .eq('merchant_id', merchantId)
    .eq('action_type', 'revenue_attributed')
    .gte('created_at', monthStart.toISOString())

  const revenueAttributed = (attrRows ?? []).reduce((s, r) => {
    const amt = (r.metadata as Record<string, number> | null)?.order_amount ?? 0
    return s + amt
  }, 0)

  const weeklyRunRate = (revenueToDate / daysElapsed) * 7
  const daysInMonth   = monthEnd.getDate()
  const projectedEndOfMonth = (revenueToDate / daysElapsed) * daysInMonth

  const pct = goalAmount > 0 ? (revenueToDate / goalAmount) * 100 : 0

  let status: GoalProgress['status']
  if (revenueToDate >= goalAmount)         status = 'achieved'
  else if (projectedEndOfMonth >= goalAmount * 0.9) status = 'on_track'
  else                                     status = 'at_risk'

  const plan = await buildGoalPlan(merchantId, goalAmount, revenueToDate, daysLeft)

  return {
    goalAmount, goalMonth, revenueToDate, revenueAttributed,
    percentToGoal: Math.round(pct),
    daysLeft, status, projectedEndOfMonth, weeklyRunRate, plan,
  }
}

async function buildGoalPlan(
  merchantId: string,
  goalAmount: number,
  revenueToDate: number,
  daysLeft: number
): Promise<GoalAction[]> {
  const remaining = goalAmount - revenueToDate
  if (remaining <= 0) return []

  const service = createServiceClient()

  // Quick segment counts to size the plan
  const { data: segRows } = await service
    .from('customers')
    .select('segment')
    .eq('merchant_id', merchantId)

  const counts: Record<string, number> = {}
  for (const r of segRows ?? []) {
    if (r.segment) counts[r.segment] = (counts[r.segment] || 0) + 1
  }

  const { data: orderRows } = await service
    .from('orders')
    .select('total_amount')
    .eq('merchant_id', merchantId)
    .gte('ordered_at', new Date(Date.now() - 30 * 86400000).toISOString())

  const avgOrder = orderRows?.length
    ? (orderRows.reduce((s, r) => s + parseFloat(r.total_amount ?? '0'), 0) / orderRows.length)
    : 50

  const actions: GoalAction[] = []
  let runningTotal = 0

  const addAction = (week: number, trigger: string, desc: string, customerCount: number, convRate: number) => {
    const est = Math.round(customerCount * convRate * avgOrder)
    actions.push({ week, trigger, description: desc, estimatedRevenue: est, status: 'pending' })
    runningTotal += est
  }

  const atRisk = (counts['at_risk'] ?? 0) + (counts['lapsed'] ?? 0)
  const newC   = counts['new'] ?? 0
  const loyal  = counts['loyal'] ?? 0
  const active = counts['active'] ?? 0

  // Week 1: Win-back (highest ROI)
  if (atRisk > 0) addAction(1, 'win_back', `Win-back campaign to ${atRisk} at-risk customers`, atRisk, 0.08)

  // Week 1: New customer nurture
  if (newC > 0) addAction(1, 'new_customer', `Second-visit push to ${newC} new customers`, newC, 0.25)

  // Week 2: VIP reward
  if (loyal > 0 && runningTotal < remaining) addAction(2, 'vip_reward', `VIP reward for ${loyal} loyal customers`, loyal, 0.12)

  // Week 2: Cross-sell to active
  if (active > 0 && runningTotal < remaining) addAction(2, 'cross_sell', `Cross-sell to ${active} active customers`, active, 0.06)

  // Week 3: Re-run win-back for any remaining gap
  if (runningTotal < remaining && atRisk > 0) addAction(3, 'win_back', 'Win-back follow-up for remaining gap', Math.round(atRisk * 0.5), 0.05)

  // Week 4: Final push — everything
  if (runningTotal < remaining) addAction(4, 'win_back', 'Final month-end push to all segments', Math.max(1, atRisk + newC), 0.04)

  return actions
}

/**
 * Called weekly by cron to update goal_status on the merchant record.
 */
export async function evaluateGoalWeekly(merchantId: string): Promise<void> {
  try {
    const progress = await computeGoalProgress(merchantId)
    if (progress.status === 'no_goal') return

    const service = createServiceClient()
    await service
      .from('merchants')
      .update({ goal_status: progress.status })
      .eq('id', merchantId)
  } catch {
    // fire-and-forget
  }
}
