/**
 * GET /api/sms/eligible-count
 * Returns count of at_risk + lapsed customers with a phone number (not in control group).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

  const { count } = await service
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)
    .in('segment', ['at_risk', 'lapsed'])
    .eq('control_group', false)
    .not('phone', 'is', null)

  return NextResponse.json({ count: count ?? 0 })
}
