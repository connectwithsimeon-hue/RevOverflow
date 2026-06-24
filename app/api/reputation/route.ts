/**
 * GET  /api/reputation — current rating/reviews (lazily refreshed from Google)
 * POST /api/reputation — connect a Google listing { placeId, businessName }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getReputation, refreshReputation, isReputationConfigured } from '@/lib/reputation'

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

  // Lazily refresh from Google if connected + stale.
  const row = await refreshReputation(merchantId)
  return NextResponse.json({ reputation: row, configured: isReputationConfigured() })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchantId = await getMerchantId(user.id)
  if (!merchantId) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const placeId = String(body?.placeId ?? '').trim()
  const businessName = String(body?.businessName ?? '').trim() || null
  if (!placeId) return NextResponse.json({ error: 'A Google Place ID is required' }, { status: 400 })

  const service = createServiceClient()
  await service
    .from('reputation')
    .upsert(
      { merchant_id: merchantId, google_place_id: placeId, business_name: businessName, updated_at: new Date().toISOString() },
      { onConflict: 'merchant_id' },
    )

  // Force an immediate first pull so the merchant sees their rating right away.
  const row = await refreshReputation(merchantId, true)

  if (!isReputationConfigured()) {
    return NextResponse.json({
      reputation: row,
      configured: false,
      note: 'Listing saved. Live review monitoring turns on once a Google Places API key is configured in the app environment.',
    })
  }
  return NextResponse.json({ reputation: row, configured: true })
}
