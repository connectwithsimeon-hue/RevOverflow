/**
 * GET /api/gelato/catalog            → list Gelato catalogs
 * GET /api/gelato/catalog?catalog=X  → list products (UIDs) in catalog X
 *
 * A merchant-facing helper so you can find your Gelato product UIDs without
 * touching Terminal. Uses the server-side GELATO_API_KEY. Returns the raw
 * Gelato payload too, so even if a field name differs you can still read the
 * productUids on screen.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const CATALOGS_URL = 'https://product.gelatoapis.com/v3/catalogs'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.GELATO_API_KEY
  if (!apiKey) {
    return NextResponse.json({ configured: false })
  }

  const headers = { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' }
  const catalog = request.nextUrl.searchParams.get('catalog')

  try {
    // ── List products in one catalog ──
    if (catalog) {
      const res = await fetch(`${CATALOGS_URL}/${encodeURIComponent(catalog)}/products:search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ limit: 100 }),
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return NextResponse.json({ configured: true, error: data?.message || `Gelato error ${res.status}`, raw: data })

      const list = Array.isArray(data?.products) ? data.products
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data) ? data : []
      const products = list
        .map((p: Record<string, unknown>) => String(p.productUid ?? p.product_uid ?? ''))
        .filter(Boolean)
      return NextResponse.json({ configured: true, products, raw: data })
    }

    // ── List catalogs ──
    const res = await fetch(CATALOGS_URL, { headers, cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ configured: true, error: data?.message || `Gelato error ${res.status}`, raw: data })

    const list = Array.isArray(data) ? data
      : Array.isArray(data?.catalogs) ? data.catalogs
      : Array.isArray(data?.data) ? data.data : []
    const catalogs = list.map((c: Record<string, unknown>) => ({
      uid: String(c.catalogUid ?? c.catalog_uid ?? c.uid ?? ''),
      title: String(c.title ?? c.name ?? c.catalogUid ?? ''),
    })).filter((c: { uid: string }) => c.uid)
    return NextResponse.json({ configured: true, catalogs, raw: data })
  } catch (err) {
    return NextResponse.json({ configured: true, error: err instanceof Error ? err.message : 'Request failed' })
  }
}
