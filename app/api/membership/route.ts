/**
 * GET  /api/membership — the merchant's membership offer (or null)
 * POST /api/membership — create/update it { name, monthlyPrice, perks, signupUrl, currentMembers, active }
 *
 * RevOverflow defines, promotes, and tracks the membership. It does NOT process
 * the payment — signupUrl points at the merchant's own checkout (e.g. Square).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

  const service = createServiceClient()
  const { data } = await service.from('memberships').select('*').eq('merchant_id', merchantId).maybeSingle()
  return NextResponse.json({ membership: data ?? null })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchantId = await getMerchantId(user.id)
  if (!merchantId) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const name = String(body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Membership name is required' }, { status: 400 })

  const monthlyPrice = Math.max(0, parseFloat(String(body.monthlyPrice ?? '0')) || 0)
  const currentMembers = Math.max(0, parseInt(String(body.currentMembers ?? '0')) || 0)

  const row = {
    merchant_id: merchantId,
    name,
    monthly_price: monthlyPrice,
    perks: typeof body.perks === 'string' ? body.perks : null,
    signup_url: typeof body.signupUrl === 'string' ? body.signupUrl.trim() || null : null,
    current_members: currentMembers,
    active: body.active !== false,
    updated_at: new Date().toISOString(),
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('memberships')
    .upsert(row, { onConflict: 'merchant_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, membership: data })
}
