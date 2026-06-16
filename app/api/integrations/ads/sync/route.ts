/**
 * POST /api/integrations/ads/sync
 * GET  /api/integrations/ads/sync   — returns connection + last-sync status
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { syncMerchantAdAudiences } from '@/lib/ad-sync'

export const dynamic = 'force-dynamic'

async function getMerchant(userId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from('merchants')
    .select('id, meta_ad_account_id, meta_custom_audience_id, meta_lookalike_audience_id, google_ads_customer_id, google_ads_user_list_resource, last_ad_sync_at')
    .eq('auth_user_id', userId)
    .single()
  return data
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchant = await getMerchant(user.id)
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  return NextResponse.json({
    metaConnected: !!merchant.meta_ad_account_id,
    metaAdAccountId: merchant.meta_ad_account_id,
    metaAudienceLive: !!merchant.meta_custom_audience_id,
    metaLookalikeLive: !!merchant.meta_lookalike_audience_id,
    googleConnected: !!merchant.google_ads_customer_id,
    googleAdsCustomerId: merchant.google_ads_customer_id,
    googleListLive: !!merchant.google_ads_user_list_resource,
    lastSyncAt: merchant.last_ad_sync_at,
  })
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchant = await getMerchant(user.id)
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const result = await syncMerchantAdAudiences(merchant.id)
  return NextResponse.json({ ok: true, result })
}
