/**
 * POST /api/integrations/ads/connect
 *
 * Saves the merchant's own Meta Ad Account ID and/or Google Ads Customer ID.
 * These are NOT secrets — they're account identifiers. RevOverflow's own
 * service-level credentials (META_ACCESS_TOKEN, GOOGLE_ADS_*) do the actual
 * API calls, after the merchant grants partner/manager access on their end.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, string | null> = {}

  if ('metaAdAccountId' in body) {
    updates.meta_ad_account_id = (body.metaAdAccountId || '').replace(/[^\d]/g, '') || null
  }
  if ('googleAdsCustomerId' in body) {
    updates.google_ads_customer_id = (body.googleAdsCustomerId || '').replace(/[^\d]/g, '') || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  await service.from('merchants').update(updates).eq('id', merchant.id)
  return NextResponse.json({ ok: true })
}
