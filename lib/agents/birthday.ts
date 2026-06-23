/**
 * Birthday Agent
 *
 * Birthday offers have the highest response rate of any trigger — they feel
 * personal, not promotional. This agent finds customers with a birthday in the
 * next two weeks and recommends a timely offer.
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { money } from './types'

const CONVERSION = 0.4
const WINDOW_DAYS = 14

/** Days until the customer's next birthday (month/day), ignoring year. */
function daysUntilBirthday(birthday: string | null): number {
  if (!birthday) return Infinity
  const b = new Date(birthday)
  if (isNaN(b.getTime())) return Infinity
  const now = new Date()
  let next = new Date(now.getFullYear(), b.getMonth(), b.getDate())
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate())
  }
  return Math.floor((next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000)
}

export function birthdayAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'birthday',
    name: 'Birthday Agent',
    icon: '🎂',
    tagline: 'Sends personal birthday offers that customers love.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS to find upcoming birthdays.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your customers.',
    }
  }

  const upcoming = ctx.customers.filter(
    (c) => c.is_reachable && c.birthday && daysUntilBirthday(c.birthday) <= WINDOW_DAYS,
  )

  if (upcoming.length === 0) {
    return {
      ...base,
      status: 'active' as const,
      statusLabel: 'Watching',
      headline: 'No birthdays in the next two weeks.',
      recommendations: [],
      dataNeeded: 'Collect customer birthdays (via your VIP signup) to power more birthday offers.',
    }
  }

  const avgOrder = upcoming.reduce((s, c) => s + c.avg_order_value, 0) / upcoming.length || 0
  const upside = Math.round(upcoming.length * avgOrder * CONVERSION)

  const recs: AgentRecommendation[] = [
    {
      title: `Send ${upcoming.length} birthday offers`,
      detail: `${upcoming.length} reachable customers have a birthday in the next ${WINDOW_DAYS} days. Birthday offers convert at the highest rate of any message — about ${money(
        upside,
      )} this month, and a lot of goodwill.`,
      estimatedRevenue: upside,
      cta: { label: 'Schedule birthday offers', href: '/campaigns' },
    },
  ]

  return {
    ...base,
    status: 'active',
    statusLabel: 'Active',
    headline: `${upcoming.length} customers have a birthday coming up.`,
    recommendations: recs,
  }
}
