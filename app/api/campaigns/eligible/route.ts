import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name')
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

      if (!sends || sends.length === 0) return { ...campaign, attribution: null }

      const sent    = sends.filter(s => !s.is_control_group)
      const control = sends.filter(s => s.is_control_group)

      const sentConverted    = sent.filter(s => s.converted_at)
      const controlConverted = control.filter(s => s.converted_at)

      const sentRevenue    = sentConverted.reduce((sum, s) => sum + parseFloat(s.conversion_value || '0'), 0)
      const controlRevenue = controlConverted.reduce((sum, s) => sum + parseFloat(s.conversion_value || '0'), 0)

      const sentRate    = sent.length    > 0 ? sentConverted.length    / sent.length    : 0
      const controlRate = control.length > 0 ? controlConverted.length / control.length : 0
      const lift        = controlRate > 0 ? ((sentRate - controlRate) / controlRate) * 100 : null

      // Incremental revenue = (sent conversions - what we'd expect without campaign)
      const expectedConversions = Math.round(sent.length * controlRate)
      const incrementalConversions = Math.max(0, sentConverted.length - expectedConversions)
      const avgOrderValue = sentConverted.length > 0 ? sentRevenue / sentConverted.length : 0
      const attributedRevenue = incrementalConversions * avgOrderValue

      return {
        ...campaign,
        attribution: {
          sentCount: sent.length,
          controlCount: control.length,
          sentConverted: sentConverted.length,
          controlConverted: controlConverted.length,
          sentRate: Math.round(sentRate * 100),
          controlRate: Math.round(controlRate * 100),
          lift: lift !== null ? Math.round(lift) : null,
          sentRevenue: Math.round(sentRevenue),
          attributedRevenue: Math.round(attributedRevenue),
        },
      }
    })
  )

  return NextResponse.json({
    customers: customers || [],
    pastCampaigns: campaignsWithStats,
    businessName: merchant.business_name,
  })
}
