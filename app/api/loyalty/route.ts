/**
 * GET  /api/loyalty — the merchant's loyalty program (or null)
 * POST /api/loyalty — create/update it { rewardName, visitsRequired, active }
 *
 * RevOverflow runs this itself off visit counts — no Square Loyalty needed.
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
  const { data } = await service.from('loyalty_programs').select('*').eq('merchant_id', merchantId).maybeSingle()
  return NextResponse.json({ loyalty: data ?? null })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchantId = await getMerchantId(user.id)
  if (!merchantId) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const rewardName = String(body?.rewardName ?? '').trim()
  if (!rewardName) return NextResponse.json({ error: 'A reward name is required' }, { status: 400 })

  const visitsRequired = Math.max(2, Math.min(100, parseInt(String(body?.visitsRequired ?? '10')) || 10))

  const row = {
    merchant_id: merchantId,
    reward_name: rewardName,
    visits_required: visitsRequired,
    active: body?.active !== false,
    updated_at: new Date().toISOString(),
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('loyalty_programs')
    .upsert(row, { onConflict: 'merchant_id' })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, loyalty: data })
}
