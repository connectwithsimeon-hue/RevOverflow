/**
 * Clover POS adapter — shared helpers
 *
 * Mirrors the Square adapter (app/api/square/*) so RevOverflow can pull
 * customers + orders from either POS into the same `customers` / `orders` /
 * `order_items` tables. Merchants connect ONE POS (Square or Clover) —
 * whichever they actually use.
 *
 * OAuth (v2):
 *   Authorize: {CLOVER_BASE_URL}/oauth/v2/authorize?client_id=...&redirect_uri=...
 *   Token:     POST {CLOVER_BASE_URL}/oauth/v2/token  { client_id, client_secret, code }
 *   Clover redirects back to our callback with ?code=...&merchant_id=...
 *
 * REST API (v3), merchant-scoped:
 *   {CLOVER_API_BASE}/v3/merchants/{merchantId}/customers   (paginated, limit/offset)
 *   {CLOVER_API_BASE}/v3/merchants/{merchantId}/orders      (paginated, limit/offset, expand=lineItems,customers)
 *
 * Env vars (Simeon pastes these into .env.local / Vercel — never in chat):
 *   CLOVER_APP_ID, CLOVER_APP_SECRET, CLOVER_REDIRECT_URL
 *   CLOVER_BASE_URL   (optional — defaults to production https://www.clover.com;
 *                      use https://sandbox.dev.clover.com for testing)
 *   CLOVER_API_BASE   (optional — defaults to production https://api.clover.com;
 *                      use https://apisandbox.dev.clover.com for testing)
 */

export function cloverOAuthBase(): string {
  return process.env.CLOVER_BASE_URL ?? 'https://www.clover.com'
}

export function cloverApiBase(): string {
  return process.env.CLOVER_API_BASE ?? 'https://api.clover.com'
}

export function cloverHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

export interface CloverCustomerRaw {
  id: string
  firstName?: string
  lastName?: string
  emailAddresses?: { elements?: { emailAddress?: string }[] }
  phoneNumbers?: { elements?: { phoneNumber?: string }[] }
}

export function mapCloverCustomer(c: CloverCustomerRaw) {
  return {
    clover_customer_id: c.id,
    name: [c.firstName, c.lastName].filter(Boolean).join(' ') || null,
    email: c.emailAddresses?.elements?.[0]?.emailAddress || null,
    phone: c.phoneNumbers?.elements?.[0]?.phoneNumber || null,
  }
}

export interface CloverOrderRaw {
  id: string
  total?: number // cents
  createdTime?: number // epoch ms
  lineItems?: { elements?: CloverLineItemRaw[] }
  customers?: { elements?: { id: string }[] }
}

export interface CloverLineItemRaw {
  name?: string
  price?: number // cents
  unitQty?: number // thousandths of a unit — Clover's convention for quantity
}

export function mapCloverOrder(o: CloverOrderRaw) {
  return {
    clover_order_id: o.id,
    total_amount: (o.total ?? 0) / 100,
    ordered_at: o.createdTime ? new Date(o.createdTime).toISOString() : new Date().toISOString(),
    customerId: o.customers?.elements?.[0]?.id ?? null,
  }
}

export function mapCloverLineItems(o: CloverOrderRaw) {
  return (o.lineItems?.elements ?? []).map((li) => ({
    catalog_name: li.name || null,
    category: null,
    quantity: li.unitQty ? Math.max(1, Math.round(li.unitQty / 1000)) : 1,
    unit_price: (li.price ?? 0) / 100,
  }))
}

/** Paginated fetch helper for Clover's limit/offset list endpoints. */
export async function fetchAllPages<T>(
  url: (offset: number) => string,
  headers: Record<string, string>,
  extractElements: (json: any) => T[],
  pageSize = 100
): Promise<T[]> {
  const all: T[] = []
  let offset = 0
  for (;;) {
    const res = await fetch(url(offset), { headers })
    if (!res.ok) {
      console.error('Clover fetch failed', res.status, await res.text())
      break
    }
    const json = await res.json()
    const elements = extractElements(json)
    all.push(...elements)
    if (elements.length < pageSize) break
    offset += pageSize
  }
  return all
}
