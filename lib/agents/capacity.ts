/**
 * Capacity Agent
 *
 * Goal: smooth demand and fill slow periods. Works entirely on Square order
 * timestamps (no booking system required) — finds the slowest DAY of the week
 * AND the slowest TIME of day, and recommends off-peak offers to shift demand
 * into both gaps. (Deeper staff/appointment balancing would need a booking
 * system, noted as the next data source.)
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const BLOCKS: { name: string; start: number; end: number }[] = [
  { name: 'mornings', start: 6, end: 11 },
  { name: 'middays', start: 11, end: 14 },
  { name: 'afternoons', start: 14, end: 17 },
  { name: 'evenings', start: 17, end: 22 },
]

export function capacityAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'capacity',
    name: 'Capacity Agent',
    icon: '📅',
    tagline: 'Fills your slow days and slow hours by shifting demand off-peak.',
  }

  if (!ctx.isConnected || ctx.orders.length < 20) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS so Yara can see your busy and slow times.',
      recommendations: [],
      dataNeeded: 'At least a few weeks of orders so the patterns are reliable.',
    }
  }

  // ── Revenue by day of week ────────────────────────────────────────────────
  const byDay = new Array(7).fill(0)
  // ── Revenue by hour of day ────────────────────────────────────────────────
  const byHour = new Array(24).fill(0)
  const hourCount = new Array(24).fill(0)
  for (const o of ctx.orders) {
    const d = new Date(o.ordered_at)
    byDay[d.getDay()] += o.total_amount
    byHour[d.getHours()] += o.total_amount
    hourCount[d.getHours()] += 1
  }

  const dayTotal = byDay.reduce((a, b) => a + b, 0)
  const dayAvg = dayTotal / 7
  let slowDay = 0
  let busyDay = 0
  for (let i = 1; i < 7; i++) {
    if (byDay[i] < byDay[slowDay]) slowDay = i
    if (byDay[i] > byDay[busyDay]) busyDay = i
  }
  const slowDayGap = dayAvg > 0 ? Math.round(((dayAvg - byDay[slowDay]) / dayAvg) * 100) : 0

  // Slowest time-of-day BLOCK that the business is actually open in.
  const blockStats = BLOCKS.map((b) => {
    let revenue = 0
    let orders = 0
    for (let h = b.start; h < b.end; h++) { revenue += byHour[h]; orders += hourCount[h] }
    return { ...b, revenue, orders }
  }).filter((b) => b.orders >= 3) // only blocks the shop is open in

  const recs: AgentRecommendation[] = [
    {
      title: `Run a ${DAYS[slowDay]}-only offer`,
      detail: `${DAYS[slowDay]} is your slowest day — about ${slowDayGap}% below your daily average, while ${DAYS[busyDay]} is your busiest. A ${DAYS[slowDay]}-only offer to lapsed customers shifts demand into the gap without discounting your busy days.`,
      cta: { label: 'Create off-peak campaign', href: '/campaigns' },
    },
  ]

  let hourHeadline = ''
  if (blockStats.length >= 2) {
    const openAvg = blockStats.reduce((s, b) => s + b.revenue, 0) / blockStats.length
    const slowBlock = blockStats.reduce((a, b) => (b.revenue < a.revenue ? b : a))
    const blockGap = openAvg > 0 ? Math.round(((openAvg - slowBlock.revenue) / openAvg) * 100) : 0
    if (blockGap >= 15) {
      recs.push({
        title: `Drive traffic to your slow ${slowBlock.name}`,
        detail: `Your ${slowBlock.name} run about ${blockGap}% below your other open hours. A "${slowBlock.name}-only" offer (e.g. a happy-hour-style deal) pulls customers into the quiet window and lifts revenue you'd otherwise miss.`,
        cta: { label: 'Create off-peak campaign', href: '/campaigns' },
      })
      hourHeadline = ` Your ${slowBlock.name} are also ${blockGap}% below your other open hours.`
    }
  }

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: `${DAYS[slowDay]} is ${slowDayGap}% below average — there is room to fill.${hourHeadline}`,
    recommendations: recs,
    dataNeeded: 'Connect a booking/scheduling system to also balance staff and appointment slots.',
  }
}
