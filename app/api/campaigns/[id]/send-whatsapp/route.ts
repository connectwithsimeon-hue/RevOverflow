/**
 * POST /api/campaigns/[id]/send-whatsapp
 *
 * Sends Telnyx WhatsApp messages to all non-control customers with a phone
 * number. Deducts 5 Yara credits per message sent (same cost as SMS).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWhatsApp, formatWhatsAppMessage } from '@/lib/whatsapp'
import { preCheckCompliance, recordMessageSent } from '@/lib/compliance'
import { deductCredits, hasCredits } from '@/lib/credits'
import { generateYaraCopy, type TriggerType } from '@/lib/yara'
import { logCampaignSent } from '@/lib/outcome'

/** Map a customer segment to the right Yara trigger */
function segmentToTrigger(segment: string | null): TriggerType {
  switch (segment) {
    case 'lapsed':   return 'win_back'
    case 'at_risk':  return 'win_back'
    case 'new':      return 'new_customer'
    case 'loyal':    return 'vip_reward'
    default:         return 'win_back'
  }
}

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
    .select('id, business_name, industry, credit_balance')
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
    .select('customer_id, is_control_group, customers(id, name, phone, segment, total_orders, lifetime_value, avg_order_value, last_purchase_at, favorite_items)')
    .eq('campaign_id', campaign.id)
    .eq('is_control_group', false)

  const targets = (sends || [])
    .map((s: any) => s.customers)
    .filter((c: any) => c?.phone)

  if (targets.length === 0) {
    return NextResponse.json({ ok: false, error: 'No customers with phone numbers in this campaign' })
  }

  // Credit gate: need 5 credits per WhatsApp message, at least enough for 1
  const creditsNeeded = 5
  if ((merchant.credit_balance ?? 0) < creditsNeeded) {
    return NextResponse.json({
      error: 'insufficient_credits',
      message: `You have ${merchant.credit_balance} Yara credits but need at least ${creditsNeeded} to send WhatsApp messages.`,
      creditsAvailable: merchant.credit_balance,
      creditsNeeded,
      buyUrl: '/pricing',
    }, { status: 402 })
  }

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const customer of targets) {
    // Compliance gate — quiet hours, rate limits, opt-out
    const compliance = await preCheckCompliance({
      merchantId: merchant.id,
      customerId: customer.id,
      channel:    'whatsapp',
    })
    if (!compliance.allowed) {
      skipped++
      continue
    }

    // Check credits before each send
    const canSend = await hasCredits(merchant.id, 'sms_sent')
    if (!canSend) {
      skipped += targets.length - sent - skipped
      break
    }

    const firstName = (customer.name || '').split(' ')[0] || 'there'
    const trigger = segmentToTrigger(customer.segment)

    // Calculate days since last visit
    const lastVisit = customer.last_purchase_at ? new Date(customer.last_purchase_at) : null
    const daysSince = lastVisit
      ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : 90

    // Ask Yara to write a personalised message for this customer
    let text: string
    try {
      const yaraResult = await generateYaraCopy(
        trigger,
        {
          firstName,
          totalOrders: customer.total_orders ?? 0,
          lifetimeValue: parseFloat(customer.lifetime_value ?? '0'),
          avgOrderValue: parseFloat(customer.avg_order_value ?? '0'),
          daysSinceLastVisit: daysSince,
          favoriteItems: customer.favorite_items ?? [],
          segment: customer.segment ?? 'unknown',
        },
        {
          businessName: merchant.business_name,
          industry: merchant.industry ?? undefined,
        }
      )
      text = yaraResult.smsText
    } catch {
      // Fallback to simple template if Yara API is down
      text = `Hey ${firstName}! We miss you at ${merchant.business_name}. Come back and we'll make it worth your while.`
    }

    const message = formatWhatsAppMessage({ text, businessName: merchant.business_name })
    const result = await sendWhatsApp({ to: customer.phone, text: message })

    if (result.ok) {
      await deductCredits(merchant.id, 'sms_sent', `WhatsApp: ${campaign.name}`, campaign.id)
      await recordMessageSent(customer.id, 'whatsapp')
      logCampaignSent({ merchantId: merchant.id, customerId: customer.id, channel: 'whatsapp', triggerType: trigger, campaignId: campaign.id }).catch(() => {})
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
