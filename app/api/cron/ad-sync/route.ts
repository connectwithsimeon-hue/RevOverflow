/**
 * Weekly ad audience sync — cron job
 *
 * Runs Mondays at 10am UTC (configured in vercel.json).
 * Refreshes Facebook suppression/lookalike audiences and Google Ads
 * Customer Match suppression lists for every merchant that has at least
 * one ad account connected.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { syncMerchantAdAudiences } from '@/lib/ad-sync'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()

  const { data: merchants } = await service
    .from('merchants')
    .select('id, business_name')
    .or('meta_ad_account_id.not.is.null,google_ads_customer_id.not.is.null')
    .in('plan', ['brain', 'empire'])
    .eq('subscription_status', 'active')

  if (!merchants || merchants.length === 0) {
    return NextResponse.json({ ok: true, message: 'No merchants with ad accounts connected', results: [] })
  }

  const results = []
  for (const merchant of merchants) {
    const result = await syncMerchantAdAudiences(merchant.id).catch((err: any) => ({ error: err?.message }))
    results.push({ merchantId: merchant.id, business: merchant.business_name, ...result })
  }

  return NextResponse.json({ ok: true, ran: new Date().toISOString(), results })
}
