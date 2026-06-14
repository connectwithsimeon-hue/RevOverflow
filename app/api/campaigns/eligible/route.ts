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

  return NextResponse.json({
    customers: customers || [],
    pastCampaigns: pastCampaigns || [],
    businessName: merchant.business_name,
  })
}
