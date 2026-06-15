/**
 * POST /api/campaigns/[id]/send-sms
 *
 * Sends Telnyx SMS to all non-control at_risk + lapsed customers with a phone number.
 * Deducts 5 Yara credits per SMS sent.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendSms, buildWinBackSms } from '@/lib/sms'
import { deductCredits, hasCredits } from '@/lib/credits'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { data: campaign } = await service
    .from('campaigns')
    .select('id, name, merchant_id, status')
    .eq('id', params.id)
    .eq('merchant_id', merchant.id)
    .single()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  // Get customers with phone numbers who are not in the control group
  const { data: sends } = await service
    .from('campaign_sends')
    .select('customer_id, is_control_group, customers(id, name, phone)')
    .eq('campaign_id', campaign.id)
    .eq('is_control_group', false)

  const targets = (sends || [])
    .map((s: any) => s.customers)
    .filter((c: any) => c?.phone)

  if (targets.length === 0) {
    return NextResponse.json({ ok: false, error: 'No customers with phone numbers in this campaign' })
  }

  // Credit gate: need 5 credits per SMS, at least enough for 1
  const creditsNeeded = 5
  if ((merchant.credit_balance ?? 0) < creditsNeeded) {
    return NextResponse.json({
      error: 'insufficient_credits',
      message: `You have ${merchant.credit_balance} Yara credits but need at least ${creditsNeeded} to send SMS.`,
      creditsAvailable: merchant.credit_balance,
      creditsNeeded,
      buyUrl: '/pricing',
    }, { status: 402 })
  }

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const customer of targets) {
    // Check credits before each send
    const canSend = await hasCredits(merchant.id, 'sms_sent')
    if (!canSend) {
      skipped += targets.length - sent - skipped
      break
    }

    const firstName = (customer.name || '').split(' ')[0] || 'there'
    const text = buildWinBackSms({ firstName, businessName: merchant.business_name })

    const result = await sendSms({ to: customer.phone, text })

    if (result.ok) {
      await deductCredits(merchant.id, 'sms_sent', `SMS: ${campaign.name}`, campaign.id)
      sent++
    } else {
      errors.push(`${customer.phone}: ${result.error}`)
      skipped++
    }
  }

  const { data: updatedMerchant } = await service
    .from('merchants')
    .select('credit_balance')
    .eq('id', merchant.id)
    .single()

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    creditsUsed: sent * 5,
    creditsRemaining: updatedMerchant?.credit_balance ?? 0,
    errors: errors.length > 0 ? errors : undefined,
  })
}
