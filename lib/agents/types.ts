/**
 * Yara Agent System — shared types
 *
 * Every agent is a pure function that takes an AgentContext (merchant data
 * loaded once by the registry) and returns an AgentResult. This keeps the
 * agents fast (no per-agent DB round-trips), consistent, and easy to test.
 *
 * Design principle from the Strategic Review: an agent is "active" only when
 * the data it needs already exists from Square / signups. When an agent needs
 * data the merchant doesn't have yet, it returns status 'needs_data' with a
 * clear, honest CTA — never a broken or fake feature.
 */

export type AgentStatus =
  | 'active'      // producing real recommendations from data the merchant has
  | 'needs_data'  // blocked — needs a data source the merchant hasn't connected
  | 'no_data'     // merchant hasn't synced a POS yet

export interface AgentRecommendation {
  title: string
  detail: string
  estimatedRevenue?: number          // monthly $ upside, when computable
  cta?: { label: string; href: string }
}

export interface AgentResult {
  id: string
  name: string
  icon: string
  tagline: string                    // one line: what this agent does for revenue
  status: AgentStatus
  statusLabel: string                // short badge text
  headline: string                   // the single most important finding
  recommendations: AgentRecommendation[]
  dataNeeded?: string                // shown when status !== 'active'
}

// ── Data the registry loads once and hands to every agent ──────────────────

export interface AgentCustomer {
  id: string
  segment: string | null
  rfv_score: number | null
  total_orders: number
  lifetime_value: number
  avg_order_value: number
  first_purchase_at: string | null
  last_purchase_at: string | null
  is_reachable: boolean
  sms_opt_in: boolean
  email_opt_in: boolean
  birthday: string | null
}

export interface AgentOrder {
  total_amount: number
  ordered_at: string
  customer_id: string | null
}

export interface AgentOrderItem {
  catalog_name: string | null
  category: string | null
  quantity: number
  unit_price: number
}

export interface AgentContext {
  merchantId: string
  industry: string | null
  plan: string
  isConnected: boolean
  customers: AgentCustomer[]
  orders: AgentOrder[]
  orderItems: AgentOrderItem[]
  productCosts: Record<string, number>   // catalog_name -> unit cost (entered by merchant)
  membership: AgentMembership | null     // the merchant's defined membership offer, if any
  reputation: AgentReputation | null     // Google reviews monitoring state, if connected
  loyalty: AgentLoyalty | null           // the merchant's defined loyalty program, if any
}

export interface AgentLoyalty {
  rewardName: string
  visitsRequired: number
}

export interface AgentMembership {
  name: string
  monthlyPrice: number
  signupUrl: string | null
  currentMembers: number
}

export interface AgentReputation {
  connected: boolean         // a Google listing is linked
  rating: number | null
  reviewCount: number | null
  prevRating: number | null
  prevReviewCount: number | null
  recentNegativeCount: number // recent reviews at 3 stars or below
}

// ── Small shared helpers ───────────────────────────────────────────────────

export const money = (n: number) =>
  Math.round(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

export function daysSince(iso: string | null): number {
  if (!iso) return Infinity
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

/** Approximate active months between first purchase and now (min 1). */
export function monthsActive(firstPurchase: string | null): number {
  if (!firstPurchase) return 1
  const months = (Date.now() - new Date(firstPurchase).getTime()) / (86400000 * 30)
  return Math.max(1, months)
}
