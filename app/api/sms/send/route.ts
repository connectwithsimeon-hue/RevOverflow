/**
 * POST /api/sms/send
 * Standalone SMS win-back — no email campaign required.
 * Finds at_risk + lapsed customers with phone numbers and sends directly.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendSms, buildWinBackSms } from '@/lib/sms'
import { deductCredits, hasCredits, CREDIT_COSTS } from '@/lib/credits'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, credit_balance')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  // Find at_risk + lapsed customers with a phone number, not in control group
  const { data: customers } = await service
    .from('customers')
    .select('id, name, phone, segment')
    .eq('merchant_id', merchant.id)
    .in('segment', ['at_risk', 'lapsed'])
    .eq('control_group', false)
    .eq('sms_opt_out', false)
    .not('phone', 'is', null)

  if (!customers || customers.length === 0) {
    return NextResponse.json({ ok: false, error: 'No customers with phone numbers in at_risk or lapsed segments' })
  }

  // Credit gate
  if ((merchant.credit_balance ?? 0) < CREDIT_COSTS.sms_sent) {
    return NextResponse.json({
      error: 'insufficient_credits',
      message: `You have ${merchant.credit_balance} credits but need at least ${CREDIT_COSTS.sms_sent} per SMS.`,
      creditsAvailable: merchant.credit_balance,
      buyUrl: '/pricing',
    }, { status: 402 })
  }

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const customer of customers) {
    const canSend = await hasCredits(merchant.id, 'sms_sent')
    if (!canSend) { skipped += customers.length - sent - skipped; break }

    const firstName = (customer.name || '').split(' ')[0] || 'there'
    const text = buildWinBackSms({ firstName, businessName: merchant.business_name })
    const result = await sendSms({ to: customer.phone, text })

    if (result.ok) {
      await deductCredits(merchant.id, 'sms_sent', `SMS win-back: ${customer.name}`)
      sent++
    } else {
      errors.push(`${customer.phone}: ${result.error}`)
      skipped++
    }
  }

  const { data: updated } = await service
    .from('merchants').select('credit_balance').eq('id', merchant.id).single()

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    total: customers.length,
    creditsUsed: sent * 5,
    creditsRemaining: updated?.credit_balance ?? 0,
    errors: errors.length > 0 ? errors : undefined,
  })
}
