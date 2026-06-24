/**
 * GET  /api/products  — list the merchant's products with sales + margin
 * POST /api/products  — save product costs { costs: [{catalogName, unitCost}] }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getProductMargins, saveProductCosts } from '@/lib/margin'

export const dynamic = 'force-dynamic'

async function getMerchantId(userId: string): Promise<string | null> {
  const service = createServiceClient()
  const { data } = await service.from('merchants').select('id').eq('auth_user_id', userId).single()
  return data?.id ?? null
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchantId = await getMerchantId(user.id)
  if (!merchantId) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const products = await getProductMargins(merchantId)
  return NextResponse.json({ products })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchantId = await getMerchantId(user.id)
  if (!merchantId) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const costs = Array.isArray(body?.costs) ? body.costs : null
  if (!costs) return NextResponse.json({ error: 'Expected { costs: [...] }' }, { status: 400 })

  const cleaned = costs
    .map((c: { catalogName?: string; unitCost?: number | string }) => ({
      catalogName: String(c.catalogName ?? '').trim(),
      unitCost: parseFloat(String(c.unitCost ?? '')),
    }))
    .filter((c: { catalogName: string; unitCost: number }) => c.catalogName && Number.isFinite(c.unitCost) && c.unitCost >= 0)

  await saveProductCosts(merchantId, cleaned)

  const products = await getProductMargins(merchantId)
  return NextResponse.json({ ok: true, saved: cleaned.length, products })
}
