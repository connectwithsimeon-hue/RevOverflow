import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { computeCampaignAttribution } from '@/lib/attribution'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, plan')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const { data: customers } = await service
    .from('customers')
    .select('id, name, email, segment, last_purchase_at, lifetime_value, control_group')
    .eq('merchant_id', merchant.id)
    .in('segment', ['at_risk', 'lapsed'])
    .not('email', 'is', null)
    .order('segment')

  const { data: pastCampaigns } = await service
    .from('campaigns')
    .select('id, name, status, total_sent, total_control, sent_at, created_at, segment_targets')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // For each past campaign, compute attribution stats from campaign_sends
  const campaignsWithStats = await Promise.all(
    (pastCampaigns || []).map(async (campaign) => {
      const { data: sends } = await service
        .from('campaign_sends')
        .select('is_control_group, converted_at, conversion_value')
        .eq('campaign_id', campaign.id)

      return { ...campaign, attribution: computeCampaignAttribution(sends) }
    })
  )

  return NextResponse.json({
    customers: customers || [],
    pastCampaigns: campaignsWithStats,
    businessName: merchant.business_name,
    plan: merchant.plan,
  })
}
