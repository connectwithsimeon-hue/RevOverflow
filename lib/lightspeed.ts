/**
 * Lightspeed Retail (X-Series) adapter — shared helpers
 *
 * Mirrors the Square/Clover/Toast adapters so RevOverflow can pull customers +
 * sales from Lightspeed into the same `customers` / `orders` / `order_items`
 * tables. lib/customer-match.ts merges by phone/email so a merchant running
 * more than one POS keeps a single unified customer base.
 *
 * OAuth (X-Series):
 *   Authorize: https://secure.retail.lightspeed.app/connect?response_type=code&client_id=...&redirect_uri=...&state=...
 *   Callback returns: code, state, AND domain_prefix (the account's subdomain)
 *   Token:     POST https://{domain_prefix}.retail.lightspeed.app/api/1.0/token
 *
 * API 2.0 (version-cursor pagination via ?after=<version>):
 *   https://{domain_prefix}.retail.lightspeed.app/api/2.0/customers
 *   https://{domain_prefix}.retail.lightspeed.app/api/2.0/sales
 *
 * Env: LIGHTSPEED_CLIENT_ID, LIGHTSPEED_CLIENT_SECRET, LIGHTSPEED_REDIRECT_URL
 *
 * NOTE: like Clover/Toast, this is built but needs a Lightspeed developer app +
 * a real account to validate exact field names against live data.
 */

export function lightspeedOAuthBase(): string {
  return 'https://secure.retail.lightspeed.app'
}

/** Each X-Series account has its own subdomain (domain_prefix). */
export function lightspeedApiBase(domainPrefix: string): string {
  return `https://${domainPrefix}.retail.lightspeed.app`
}

export function lightspeedHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

export interface LightspeedCustomerRaw {
  id: string
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  mobile?: string
  date_of_birth?: string
}

export function mapLightspeedCustomer(c: LightspeedCustomerRaw) {
  return {
    lightspeed_customer_id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(' ') || null,
    email: c.email || null,
    phone: c.phone || c.mobile || null,
    birthday: c.date_of_birth || null,
  }
}

export interface LightspeedSaleProductRaw {
  product_id?: string
  name?: string
  quantity?: number
  price?: number // unit price, dollars
}

export interface LightspeedSaleRaw {
  id: string
  customer_id?: string | null
  total_price?: number // dollars
  sale_date?: string // ISO
  register_sale_products?: LightspeedSaleProductRaw[]
  line_items?: LightspeedSaleProductRaw[]
}

export function mapLightspeedSale(s: LightspeedSaleRaw) {
  return {
    lightspeed_sale_id: s.id,
    total_amount: typeof s.total_price === 'number' ? s.total_price : 0,
    ordered_at: s.sale_date ? new Date(s.sale_date).toISOString() : new Date().toISOString(),
    customerId: s.customer_id ?? null,
  }
}

export function mapLightspeedLineItems(s: LightspeedSaleRaw) {
  const items = s.register_sale_products ?? s.line_items ?? []
  return items.map((li) => ({
    catalog_name: li.name || null,
    category: null,
    quantity: li.quantity && li.quantity > 0 ? Math.round(li.quantity) : 1,
    unit_price: typeof li.price === 'number' ? li.price : 0,
  }))
}

/**
 * X-Series 2.0 pagination: each list response is { data: [...], version: { max } }.
 * Keep requesting ?after=<version.max> until a page comes back empty.
 */
export async function fetchAllVersioned<T>(
  apiBase: string,
  path: string, // e.g. '/api/2.0/customers'
  headers: Record<string, string>,
  pageSize = 200,
): Promise<T[]> {
  const all: T[] = []
  let after = 0
  for (;;) {
    const sep = path.includes('?') ? '&' : '?'
    const res = await fetch(`${apiBase}${path}${sep}after=${after}&page_size=${pageSize}`, { headers })
    if (!res.ok) {
      console.error('Lightspeed fetch failed', res.status, await res.text())
      break
    }
    const json = await res.json()
    const data: T[] = json.data ?? []
    all.push(...data)
    const maxVersion = json.version?.max
    if (data.length === 0 || maxVersion == null || maxVersion <= after) break
    after = maxVersion
  }
  return all
}
