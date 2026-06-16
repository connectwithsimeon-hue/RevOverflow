/**
 * GET /api/trust
 * Returns the current trust score and guardrail limits for the merchant.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { computeTrustScore } from '@/lib/trust'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const trust = await computeTrustScore(merchant.id)
  return NextResponse.json(trust)
}
