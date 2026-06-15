/**
 * Debug: runs the full SMS send logic with verbose output.
 * GET /api/debug/test-sms-send
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendSms, buildWinBackSms } from '@/lib/sms'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant, error: mErr } = await service
    .from('merchants')
    .select('id, business_name, credit_balance, plan')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant', detail: mErr }, { status: 404 })

  const { data: customers, error: cErr } = await service
    .from('customers')
    .select('id, name, phone, segment, control_group')
    .eq('merchant_id', merchant.id)
    .in('segment', ['at_risk', 'lapsed'])
    .eq('control_group', false)
    .not('phone', 'is', null)

  const log: any[] = []

  for (const customer of customers || []) {
    const firstName = (customer.name || '').split(' ')[0] || 'there'
    const text = buildWinBackSms({ firstName, businessName: merchant.business_name })
    const result = await sendSms({ to: customer.phone, text })
    log.push({ customer: customer.name, phone: customer.phone, text, result })
  }

  return NextResponse.json({
    merchant: { id: merchant.id, name: merchant.business_name, plan: merchant.plan, credits: merchant.credit_balance },
    customersFound: customers?.length ?? 0,
    customersError: cErr,
    telnyxFrom: process.env.TELNYX_FROM_NUMBER || 'NOT SET',
    telnyxKeySet: !!process.env.TELNYX_API_KEY,
    sends: log,
  })
}
