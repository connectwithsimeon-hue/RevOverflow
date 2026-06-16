/**
 * Toast POS adapter — shared helpers
 *
 * Toast's integration model is different from Square/Clover: there is no
 * merchant-facing "Connect Toast" OAuth redirect. Toast issues ONE
 * client id/secret to RevOverflow (the integration partner), and Toast
 * manually grants that integration access to specific restaurants. The
 * merchant just needs to give us their Toast Restaurant GUID — found in
 * their Toast back-office under Restaurant Info.
 *
 * Auth (client credentials, not per-merchant):
 *   POST {TOAST_API_BASE}/authentication/v1/authentication/login
 *   body: { clientId, clientSecret, userAccessType: "TOAST_MACHINE_CLIENT" }
 *   → { token: { accessToken, expiresIn, ... } }
 *
 * Every API call after that carries:
 *   Authorization: Bearer {accessToken}
 *   Toast-Restaurant-External-ID: {restaurantGuid}
 *
 * Orders (v2), fetched per business date (Toast doesn't support a single
 * date-range query — one call per day):
 *   GET {TOAST_API_BASE}/orders/v2/orders?date=YYYYMMDD
 *   → full Order objects for that day, each with one or more `checks[]`.
 *   Each check has its own customer + its own total, so we treat each
 *   CHECK as one "order" row in our schema (toast_order_id = check guid).
 *
 * Customers (CRM):
 *   GET {TOAST_API_BASE}/crm/v1/customers   (paginated via pageToken)
 *
 * Env vars (Simeon pastes these into .env.local / Vercel — never in chat):
 *   TOAST_CLIENT_ID, TOAST_CLIENT_SECRET
 *   TOAST_API_BASE     (optional — defaults to production https://ws-api.toasttab.com)
 *   TOAST_WEBHOOK_SECRET (optional — shared secret Toast sends back in the
 *                          webhook request so we can verify it's really Toast)
 */

export function toastApiBase(): string {
  return process.env.TOAST_API_BASE ?? 'https://ws-api.toasttab.com'
}

/** Fetches a fresh access token. Tokens are short-lived (~1hr) — simplest
 *  and most reliable in a serverless environment is to just request a new
 *  one per sync/webhook call rather than caching across invocations. */
export async function getToastAccessToken(): Promise<string> {
  const res = await fetch(`${toastApiBase()}/authentication/v1/authentication/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.TOAST_CLIENT_ID,
      clientSecret: process.env.TOAST_CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    }),
  })
  if (!res.ok) {
    throw new Error(`Toast auth failed: ${res.status} ${await res.text()}`)
  }
  const json = await res.json()
  return json.token.accessToken as string
}

export function toastHeaders(accessToken: string, restaurantGuid: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Toast-Restaurant-External-ID': restaurantGuid,
    'Content-Type': 'application/json',
  }
}

export interface ToastCustomerRaw {
  guid: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
}

export function mapToastCustomer(c: ToastCustomerRaw) {
  return {
    toast_customer_id: c.guid,
    name: [c.firstName, c.lastName].filter(Boolean).join(' ') || null,
    email: c.email || null,
    phone: c.phone || null,
  }
}

export interface ToastSelectionRaw {
  displayName?: string
  quantity?: number
  price?: number // dollars, not cents
}

export interface ToastCheckRaw {
  guid: string
  totalAmount?: number // dollars
  amount?: number
  customer?: { guid: string; firstName?: string; lastName?: string; email?: string; phone?: string } | null
  selections?: ToastSelectionRaw[]
}

export interface ToastOrderRaw {
  guid: string
  openedDate?: string // ISO
  businessDate?: number // YYYYMMDD
  checks?: ToastCheckRaw[]
}

/** Each Toast check becomes one row in our `orders` table — checks are
 *  billed (and customer-attributed) independently within a shared order. */
export function mapToastChecks(o: ToastOrderRaw) {
  return (o.checks ?? []).map((check) => ({
    toast_order_id: check.guid,
    total_amount: check.totalAmount ?? check.amount ?? 0,
    ordered_at: o.openedDate ?? new Date().toISOString(),
    customerId: check.customer?.guid ?? null,
    customer: check.customer ?? null,
  }))
}

export function mapToastLineItems(check: ToastCheckRaw) {
  return (check.selections ?? []).map((s) => ({
    catalog_name: s.displayName || null,
    category: null,
    quantity: s.quantity && s.quantity > 0 ? Math.round(s.quantity) : 1,
    unit_price: s.price ?? 0,
  }))
}

/** YYYYMMDD strings for each day in [daysAgo, today], oldest first. */
export function businessDateRange(daysAgo: number): string[] {
  const dates: string[] = []
  const today = new Date()
  for (let i = daysAgo; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}${m}${day}`)
  }
  return dates
}

/** Paginated fetch helper for Toast's pageToken-based list endpoints
 *  (the next-page token comes back in a response header, mirroring how
 *  Square's cursor pagination works). */
export async function fetchToastPages<T>(
  urlBase: string,
  headers: Record<string, string>
): Promise<T[]> {
  const all: T[] = []
  let pageToken: string | null = null
  while (true) {
    const pageUrl: string = pageToken ? `${urlBase}&pageToken=${encodeURIComponent(pageToken)}` : urlBase
    const res: Response = await fetch(pageUrl, { headers })
    if (!res.ok) {
      console.error('Toast fetch failed', res.status, await res.text())
      break
    }
    const elements = (await res.json()) as T[]
    all.push(...elements)
    pageToken = res.headers.get('Toast-Next-Page-Token')
    if (!pageToken || elements.length === 0) break
  }
  return all
}
