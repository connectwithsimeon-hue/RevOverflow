/**
 * GET /api/reputation/search?q=... — find a merchant's Google listing by name,
 * so they never have to deal with a Place ID. Returns up to 6 candidates.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { searchPlaces, isReputationConfigured } from '@/lib/reputation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Confirm the caller is a real merchant.
  const service = createServiceClient()
  const { data: merchant } = await service.from('merchants').select('id').eq('auth_user_id', user.id).single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const q = request.nextUrl.searchParams.get('q') ?? ''
  if (!q.trim()) return NextResponse.json({ candidates: [], configured: isReputationConfigured() })

  if (!isReputationConfigured()) {
    return NextResponse.json({ candidates: [], configured: false })
  }

  const candidates = await searchPlaces(q)
  return NextResponse.json({ candidates, configured: true })
}
