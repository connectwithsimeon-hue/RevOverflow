/**
 * Capacity Agent
 *
 * Goal: smooth demand and fill slow periods. Works entirely on Square order
 * timestamps (no booking system required) — finds the slowest day of the week
 * and recommends an off-peak offer to shift demand there.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function capacityAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'capacity',
    name: 'Capacity Agent',
    icon: '📅',
    tagline: 'Fills your slow days by shifting demand off-peak.',
  }

  if (!ctx.isConnected || ctx.orders.length < 20) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS so Yara can see your busy and slow days.',
      recommendations: [],
      dataNeeded: 'At least a few weeks of orders so day-of-week patterns are reliable.',
    }
  }

  // Revenue by day of week.
  const byDay = new Array(7).fill(0)
  for (const o of ctx.orders) {
    const d = new Date(o.ordered_at).getDay()
    byDay[d] += o.total_amount
  }
  const total = byDay.reduce((a, b) => a + b, 0)
  const avg = total / 7

  let slowest = 0
  let busiest = 0
  for (let i = 1; i < 7; i++) {
    if (byDay[i] < byDay[slowest]) slowest = i
    if (byDay[i] > byDay[busiest]) busiest = i
  }

  const slowGap = avg > 0 ? Math.round(((avg - byDay[slowest]) / avg) * 100) : 0

  const recs: AgentRecommendation[] = [
    {
      title: `Run a ${DAYS[slowest]}-only offer`,
      detail: `${DAYS[slowest]} is your slowest day — about ${slowGap}% below your daily average, while ${DAYS[busiest]} is your busiest. A ${DAYS[slowest]}-only win-back offer to lapsed customers shifts demand into the gap and lifts revenue without discounting your busy days.`,
      cta: { label: 'Create off-peak campaign', href: '/campaigns' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: `${DAYS[slowest]} is ${slowGap}% below average — there is room to fill.`,
    recommendations: recs,
    dataNeeded: 'Connect a booking/scheduling system to also balance staff and appointment slots.',
  }
}
