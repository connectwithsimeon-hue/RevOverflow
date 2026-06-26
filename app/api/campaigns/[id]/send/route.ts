import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWinBackEmail } from '@/lib/email'
import { deductEmailBatch, deductCampaignFee, CREDIT_COSTS } from '@/lib/credits'
import { generateYaraCopy, type TriggerType } from '@/lib/yara'
import { logCampaignSent } from '@/lib/outcome'

function segmentToTrigger(segment: string | null): TriggerType {
  switch (segment) {
    case 'lapsed':  return 'win_back'
    case 'at_risk': return 'win_back'
    case 'new':     return 'new_customer'
    case 'loyal':   return 'vip_reward'
    default:        return 'win_back'
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
    .select('*')
    .eq('id', params.id)
    .eq('merchant_id', merchant.id)
    .single()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status === 'sent') return NextResponse.json({ error: 'Already sent' }, { status: 400 })

  // Load eligible customers — with full profile for Yara personalisation
  const targets = campaign.segment_targets as string[]
  const { data: customers } = await service
    .from('customers')
    .select('id, name, email, segment, control_group, total_orders, lifetime_value, avg_order_value, last_purchase_at, favorite_items')
    .eq('merchant_id', merchant.id)
    .in('segment', targets)
    .not('email', 'is', null)

  if (!customers || customers.length === 0) {
    return NextResponse.json({ error: 'No eligible customers' }, { status: 400 })
  }

  // ── Credit gate ──
  const sendableCustomers = customers.filter(c => !c.control_group)
  const creditsNeeded     = sendableCustomers.length * CREDIT_COSTS.email_sent  // 1 credit per email
  const creditsAvailable  = merchant.credit_balance ?? 0
  if (creditsAvailable < CREDIT_COSTS.email_sent) {
    return NextResponse.json({
      error:            'insufficient_credits',
      message:          `You have ${creditsAvailable} Yara credits — you need at least ${CREDIT_COSTS.email_sent} to send. Buy more credits to continue.`,
      creditsAvailable,
      creditsNeeded,
      buyUrl:           '/pricing',
    }, { status: 402 })
  }

  // One-time campaign strategy fee — the "Yara built this" line.
  await deductCampaignFee(merchant.id, `Email: ${campaign.name}`, campaign.id)

  let totalSent = 0
  let totalControl = 0
  const sendErrors: { email: string; error: string }[] = []

  for (const customer of customers) {
    const isControl = customer.control_group === true

    // Log the send record
    await service.from('campaign_sends').insert({
      campaign_id: campaign.id,
      merchant_id: merchant.id,
      customer_id: customer.id,
      email: customer.email,
      is_control_group: isControl,
      sent_at: isControl ? null : new Date().toISOString(),
    })

    if (isControl) {
      totalControl++
      continue // Don't email the control group
    }

    // Personalise the email with Yara's AI copy
    const firstName = (customer.name || '').split(' ')[0] || 'there'
    const trigger = segmentToTrigger(customer.segment)
    const lastVisit = customer.last_purchase_at ? new Date(customer.last_purchase_at) : null
    const daysSince = lastVisit
      ? Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
      : 90

    let emailSubject: string
    let emailBodyHtml: string
    try {
      const yara = await generateYaraCopy(
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
      emailSubject  = yara.emailSubject
      emailBodyHtml = yara.emailBodyHtml
    } catch {
      // Fallback to the campaign's static template if Yara is unavailable
      emailSubject  = campaign.subject.replace(/\{\{first_name\}\}/g, firstName)
      emailBodyHtml = campaign.body_html
        .replace(/\{\{first_name\}\}/g, firstName)
        .replace(/\{\{business_name\}\}/g, merchant.business_name)
    }

    try {
      await sendWinBackEmail({
        to: customer.email,
        customerName: customer.name || '',
        businessName: merchant.business_name,
        subject: emailSubject,
        bodyHtml: emailBodyHtml,
      })
      totalSent++
      logCampaignSent({ merchantId: merchant.id, customerId: customer.id, channel: 'email', triggerType: trigger, campaignId: campaign.id }).catch(() => {})
    } catch (err: any) {
      console.error(`Failed to send to ${customer.email}:`, err?.message || err)
      sendErrors.push({ email: customer.email, error: err?.message || String(err) })
    }
  }

  // Deduct credits for emails actually sent
  let creditsDeducted = 0
  let creditsRemaining = merchant.credit_balance ?? 0
  if (totalSent > 0) {
    const creditResult = await deductEmailBatch(merchant.id, totalSent, campaign.id)
    creditsDeducted  = totalSent * 2
    creditsRemaining = creditResult.balance
  }

  // Mark campaign as sent
  await service.from('campaigns').update({
    status: 'sent',
    total_sent: totalSent,
    total_control: totalControl,
    sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', campaign.id)

  return NextResponse.json({ ok: true, totalSent, totalControl, sendErrors, creditsDeducted, creditsRemaining })
}
