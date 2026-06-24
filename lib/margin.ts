/**
 * Margin / Profit Engine
 *
 * Square/Clover/Toast give us the selling price (order_items.unit_price) but
 * never the cost. The merchant enters cost per product (product_costs table).
 * This module turns line items + costs into per-product margins, which power:
 *   - the Profit agent (promote high-margin items, protect low-margin ones)
 *   - the Inventory agent (margin-protected promotions)
 *   - the merchant's product/cost page
 */

import { createServiceClient } from '@/lib/supabase/server'

export interface LineItemLike {
  catalog_name: string | null
  category: string | null
  quantity: number
  unit_price: number
}

export interface ProductMargin {
  catalogName: string
  category: string | null
  unitsSold: number
  revenue: number
  avgPrice: number
  unitCost: number | null    // null = merchant hasn't entered a cost yet
  marginPct: number | null   // 0-100, null if cost unknown
  grossProfit: number | null // (avgPrice - cost) * unitsSold
}

/** Pure: aggregate line items by product and join in the merchant's costs. */
export function computeProductMargins(
  items: LineItemLike[],
  costs: Record<string, number>,
): ProductMargin[] {
  const agg = new Map<string, { category: string | null; units: number; revenue: number }>()
  for (const it of items) {
    const name = it.catalog_name?.trim()
    if (!name) continue
    const row = agg.get(name) ?? { category: it.category ?? null, units: 0, revenue: 0 }
    row.units += it.quantity
    row.revenue += it.quantity * it.unit_price
    if (!row.category && it.category) row.category = it.category
    agg.set(name, row)
  }

  const out: ProductMargin[] = []
  for (const [catalogName, row] of Array.from(agg.entries())) {
    const avgPrice = row.units > 0 ? row.revenue / row.units : 0
    const hasCost = Object.prototype.hasOwnProperty.call(costs, catalogName)
    const unitCost = hasCost ? costs[catalogName] : null
    let marginPct: number | null = null
    let grossProfit: number | null = null
    if (unitCost !== null && avgPrice > 0) {
      marginPct = Math.max(-100, Math.round(((avgPrice - unitCost) / avgPrice) * 100))
      grossProfit = Math.round((avgPrice - unitCost) * row.units)
    }
    out.push({ catalogName, category: row.category, unitsSold: row.units, revenue: Math.round(row.revenue), avgPrice: Math.round(avgPrice * 100) / 100, unitCost, marginPct, grossProfit })
  }
  // Highest revenue first by default.
  return out.sort((a, b) => b.revenue - a.revenue)
}

export interface MarginInsight {
  products: ProductMargin[]
  withCost: ProductMargin[]      // products that have a cost entered
  highMargin: ProductMargin[]    // margin >= 60%, sorted by margin desc
  lowMargin: ProductMargin[]     // margin <= 25%, the ones NOT to discount
  unknownCount: number           // products still missing a cost
  blendedMarginPct: number | null
}

/** Classify products into high/low margin buckets and a blended margin. */
export function classifyMargins(products: ProductMargin[]): MarginInsight {
  const withCost = products.filter((p) => p.marginPct !== null)
  const highMargin = withCost
    .filter((p) => (p.marginPct as number) >= 60)
    .sort((a, b) => (b.marginPct as number) - (a.marginPct as number))
  const lowMargin = withCost
    .filter((p) => (p.marginPct as number) <= 25)
    .sort((a, b) => (a.marginPct as number) - (b.marginPct as number))

  let blendedMarginPct: number | null = null
  if (withCost.length > 0) {
    const totalRevenue = withCost.reduce((s, p) => s + p.revenue, 0)
    const totalProfit = withCost.reduce((s, p) => s + (p.grossProfit ?? 0), 0)
    blendedMarginPct = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : null
  }

  return {
    products,
    withCost,
    highMargin,
    lowMargin,
    unknownCount: products.length - withCost.length,
    blendedMarginPct,
  }
}

/** Async: load a merchant's last-180-day products + their entered costs. */
export async function getProductMargins(merchantId: string): Promise<ProductMargin[]> {
  const service = createServiceClient()
  const since = new Date(Date.now() - 180 * 86400000).toISOString()

  const [{ data: items }, { data: costRows }] = await Promise.all([
    service
      .from('order_items')
      .select('catalog_name, category, quantity, unit_price, orders!inner(ordered_at)')
      .eq('merchant_id', merchantId)
      .gte('orders.ordered_at', since)
      .limit(10000),
    service
      .from('product_costs')
      .select('catalog_name, unit_cost')
      .eq('merchant_id', merchantId),
  ])

  const costs: Record<string, number> = {}
  for (const c of costRows ?? []) costs[c.catalog_name] = parseFloat(c.unit_cost ?? '0')

  const lineItems: LineItemLike[] = (items ?? []).map((i) => ({
    catalog_name: i.catalog_name,
    category: i.category,
    quantity: i.quantity ?? 0,
    unit_price: parseFloat(i.unit_price ?? '0'),
  }))

  return computeProductMargins(lineItems, costs)
}

/** Save (upsert) a batch of product costs for a merchant. */
export async function saveProductCosts(
  merchantId: string,
  costs: { catalogName: string; unitCost: number }[],
): Promise<void> {
  const service = createServiceClient()
  const rows = costs
    .filter((c) => c.catalogName && Number.isFinite(c.unitCost) && c.unitCost >= 0)
    .map((c) => ({
      merchant_id: merchantId,
      catalog_name: c.catalogName,
      unit_cost: c.unitCost,
      updated_at: new Date().toISOString(),
    }))
  if (rows.length === 0) return
  await service.from('product_costs').upsert(rows, { onConflict: 'merchant_id,catalog_name' })
}
