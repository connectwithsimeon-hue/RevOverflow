/**
 * RevOverflow — RFV Scoring Engine
 *
 * Scores every customer on three axes, each 0-100:
 *   Recency  — how recently they purchased
 *   Frequency — how often they purchase
 *   Value    — how much they spend relative to the merchant average
 *
 * Composite score = (R * 0.4) + (F * 0.3) + (V * 0.3)
 *
 * Segments are derived from the composite score + recency:
 *   new      — 1 order, purchased within 60 days
 *   active   — score >= 65, last purchase within 60 days
 *   loyal    — score >= 65, frequency >= 4 orders
 *   at_risk  — previously active, last purchase 61-120 days ago
 *   lapsed   — last purchase 121-365 days ago
 *   lost     — last purchase > 365 days ago
 */

export type CustomerSegment = 'new' | 'active' | 'loyal' | 'at_risk' | 'lapsed' | 'lost'

export interface CustomerData {
  id: string
  total_orders: number
  lifetime_value: number
  avg_order_value: number
  last_purchase_at: string | null
  first_purchase_at: string | null
}

export interface RFVResult {
  rfv_recency: number
  rfv_frequency: number
  rfv_value: number
  rfv_score: number
  segment: CustomerSegment
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 9999
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function scoreRecency(days: number): number {
  if (days <= 14)  return 100
  if (days <= 30)  return 90
  if (days <= 45)  return 78
  if (days <= 60)  return 65
  if (days <= 90)  return 48
  if (days <= 120) return 32
  if (days <= 180) return 18
  if (days <= 365) return 8
  return 0
}

function scoreFrequency(orders: number, merchantMedian: number): number {
  if (orders <= 0) return 0
  if (orders === 1) return 15
  // Score relative to merchant median
  const ratio = orders / Math.max(merchantMedian, 1)
  if (ratio >= 4)   return 100
  if (ratio >= 3)   return 85
  if (ratio >= 2)   return 70
  if (ratio >= 1.5) return 55
  if (ratio >= 1)   return 40
  if (ratio >= 0.5) return 25
  return 15
}

function scoreValue(ltv: number, merchantAvgLtv: number): number {
  if (ltv <= 0 || merchantAvgLtv <= 0) return 0
  const ratio = ltv / merchantAvgLtv
  if (ratio >= 5)   return 100
  if (ratio >= 3)   return 88
  if (ratio >= 2)   return 75
  if (ratio >= 1.5) return 62
  if (ratio >= 1)   return 50
  if (ratio >= 0.5) return 32
  return 15
}

function deriveSegment(
  r: number,
  f: number,
  score: number,
  totalOrders: number,
  daysSinceLastPurchase: number
): CustomerSegment {
  if (daysSinceLastPurchase > 365) return 'lost'
  if (daysSinceLastPurchase > 120) return 'lapsed'
  if (daysSinceLastPurchase > 60)  return 'at_risk'
  if (totalOrders === 1)            return 'new'
  if (totalOrders >= 4 && score >= 60) return 'loyal'
  return 'active'
}

export function scoreCustomers(
  customers: CustomerData[]
): Map<string, RFVResult> {
  if (customers.length === 0) return new Map()

  // Compute merchant-level benchmarks
  const withOrders = customers.filter(c => c.total_orders > 0)
  const orderCounts = withOrders.map(c => c.total_orders).sort((a, b) => a - b)
  const merchantMedianOrders = orderCounts[Math.floor(orderCounts.length / 2)] || 1

  const ltvValues = withOrders.map(c => Number(c.lifetime_value))
  const merchantAvgLtv = ltvValues.length
    ? ltvValues.reduce((a, b) => a + b, 0) / ltvValues.length
    : 1

  const results = new Map<string, RFVResult>()

  for (const c of customers) {
    const days = daysSince(c.last_purchase_at)
    const r = scoreRecency(days)
    const f = scoreFrequency(c.total_orders, merchantMedianOrders)
    const v = scoreValue(Number(c.lifetime_value), merchantAvgLtv)
    const composite = Math.round(r * 0.4 + f * 0.3 + v * 0.3)
    const segment = deriveSegment(r, f, composite, c.total_orders, days)

    results.set(c.id, {
      rfv_recency: r,
      rfv_frequency: f,
      rfv_value: v,
      rfv_score: composite,
      segment,
    })
  }

  return results
}
