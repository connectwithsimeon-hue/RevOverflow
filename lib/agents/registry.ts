/**
 * Agent Registry
 *
 * Loads the merchant's data ONCE, then runs every agent against it.
 * Add a new agent by importing it and appending to AGENTS.
 */

import { createServiceClient } from '@/lib/supabase/server'
import type { AgentContext, AgentResult, AgentCustomer, AgentOrder, AgentOrderItem } from './types'

import { winbackAgent } from './winback'
import { vipAgent } from './vip'
import { crosssellAgent } from './crosssell'
import { newCustomerAgent } from './newcustomer'
import { birthdayAgent } from './birthday'
import { membershipAgent } from './membership'
import { capacityAgent } from './capacity'
import { acquisitionAgent } from './acquisition'
import { reputationAgent } from './reputation'
import { inventoryAgent } from './inventory'
import { profitAgent } from './profit'
import { flashOfferAgent } from './flashoffer'

// Order here = display order on the dashboard. The goal-closer leads; core
// revenue drivers next; agents that need an extra data source last.
const AGENTS: Array<(ctx: AgentContext) => AgentResult> = [
  flashOfferAgent,
  winbackAgent,
  vipAgent,
  crosssellAgent,
  newCustomerAgent,
  birthdayAgent,
  membershipAgent,
  capacityAgent,
  profitAgent,
  inventoryAgent,
  acquisitionAgent,
  reputationAgent,
]

export async function runAllAgents(merchantId: string): Promise<AgentResult[]> {
  const ctx = await loadContext(merchantId)
  return AGENTS.map((agent) => agent(ctx))
}

async function loadContext(merchantId: string): Promise<AgentContext> {
  const service = createServiceClient()

  const { data: merchant } = await service
    .from('merchants')
    .select('industry, plan, square_merchant_id, clover_merchant_id, toast_restaurant_guid, lightspeed_domain_prefix, meta_ad_account_id, google_ads_customer_id, goal_amount, goal_month')
    .eq('id', merchantId)
    .single()

  const isConnected = !!(
    merchant?.square_merchant_id ||
    merchant?.clover_merchant_id ||
    merchant?.toast_restaurant_guid ||
    merchant?.lightspeed_domain_prefix
  )

  const adsConnected = !!(merchant?.meta_ad_account_id || merchant?.google_ads_customer_id)

  // Pull last 180 days of orders — enough for day-of-week patterns without
  // scanning the whole history.
  const since = new Date(Date.now() - 180 * 86400000).toISOString()

  const [{ data: customerRows }, { data: orderRows }, { data: itemRows }, { data: costRows }, { data: membershipRow }, { data: reputationRow }] = await Promise.all([
    service
      .from('customers')
      .select('id, segment, rfv_score, total_orders, lifetime_value, avg_order_value, first_purchase_at, last_purchase_at, is_reachable, sms_opt_in, email_opt_in, birthday')
      .eq('merchant_id', merchantId),
    service
      .from('orders')
      .select('total_amount, ordered_at, customer_id')
      .eq('merchant_id', merchantId)
      .gte('ordered_at', since),
    service
      .from('order_items')
      .select('catalog_name, category, quantity, unit_price')
      .eq('merchant_id', merchantId)
      .limit(5000),
    service
      .from('product_costs')
      .select('catalog_name, unit_cost')
      .eq('merchant_id', merchantId),
    service
      .from('memberships')
      .select('name, monthly_price, signup_url, current_members, active')
      .eq('merchant_id', merchantId)
      .maybeSingle(),
    service
      .from('reputation')
      .select('google_place_id, rating, review_count, prev_rating, prev_review_count, recent_reviews')
      .eq('merchant_id', merchantId)
      .maybeSingle(),
  ])

  const customers: AgentCustomer[] = (customerRows ?? []).map((c) => ({
    id: c.id,
    segment: c.segment,
    rfv_score: c.rfv_score,
    total_orders: c.total_orders ?? 0,
    lifetime_value: parseFloat(c.lifetime_value ?? '0'),
    avg_order_value: parseFloat(c.avg_order_value ?? '0'),
    first_purchase_at: c.first_purchase_at,
    last_purchase_at: c.last_purchase_at,
    is_reachable: !!c.is_reachable,
    sms_opt_in: !!c.sms_opt_in,
    email_opt_in: !!c.email_opt_in,
    birthday: c.birthday,
  }))

  const orders: AgentOrder[] = (orderRows ?? []).map((o) => ({
    total_amount: parseFloat(o.total_amount ?? '0'),
    ordered_at: o.ordered_at,
    customer_id: o.customer_id,
  }))

  const orderItems: AgentOrderItem[] = (itemRows ?? []).map((i) => ({
    catalog_name: i.catalog_name,
    category: i.category,
    quantity: i.quantity ?? 0,
    unit_price: parseFloat(i.unit_price ?? '0'),
  }))

  const productCosts: Record<string, number> = {}
  for (const c of costRows ?? []) productCosts[c.catalog_name] = parseFloat(c.unit_cost ?? '0')

  const membership = membershipRow && membershipRow.active
    ? {
        name: membershipRow.name as string,
        monthlyPrice: parseFloat(membershipRow.monthly_price ?? '0'),
        signupUrl: (membershipRow.signup_url as string | null) ?? null,
        currentMembers: (membershipRow.current_members as number) ?? 0,
      }
    : null

  const reputation = reputationRow
    ? {
        connected: !!reputationRow.google_place_id,
        rating: reputationRow.rating != null ? parseFloat(reputationRow.rating as string) : null,
        reviewCount: (reputationRow.review_count as number | null) ?? null,
        prevRating: reputationRow.prev_rating != null ? parseFloat(reputationRow.prev_rating as string) : null,
        prevReviewCount: (reputationRow.prev_review_count as number | null) ?? null,
        recentNegativeCount: Array.isArray(reputationRow.recent_reviews)
          ? (reputationRow.recent_reviews as Array<{ rating: number }>).filter((r) => (r.rating ?? 5) <= 3).length
          : 0,
      }
    : null

  // ── Revenue goal + this-calendar-month revenue (for the Flash Offer agent) ──
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const goalActive = merchant?.goal_month === currentMonth
  const goalAmount = goalActive && merchant?.goal_amount ? parseFloat(merchant.goal_amount as string) : null
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const monthRevenue = orders
    .filter((o) => new Date(o.ordered_at).getTime() >= monthStart)
    .reduce((s, o) => s + o.total_amount, 0)

  return {
    merchantId,
    industry: merchant?.industry ?? null,
    plan: merchant?.plan ?? 'capture',
    isConnected,
    customers,
    orders,
    orderItems,
    productCosts,
    membership,
    reputation,
    adsConnected,
    goalAmount,
    monthRevenue,
  }
}
