/**
 * Debug-only: trigger autonomous Yara for the logged-in merchant.
 * Session-protected so Simeon can test from the browser.
 * Runs the same logic as the production cron.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendWinBackEmail } from '@/lib/email'
import { deductEmailBatch, CREDIT_COSTS } from '@/lib/credits'

const DEFAULT_BODY_HTML = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:2rem;color:#1a1a1a">
  <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:1rem">Hey {{first_name}}, we miss you! 👋</h2>
  <p style="color:#555;line-height:1.7;margin-bottom:1.5rem">It's been a while since we've seen you at {{business_name}}, and we wanted to reach out personally.</p>
  <p style="color:#555;line-height:1.7;margin-bottom:1.5rem">Your next visit means a lot to us. Come back and we'll make sure it's worth your while.</p>
  <a href="#" style="display:inline-block;background:#7C5CFC;color:#fff;padding:0.875rem 2rem;border-radius:8px;text-decoration:none;font-weight:700;margin-bottom:1.5rem">Come back &amp; save</a>
  <p style="color:#999;font-size:0.875rem;line-height:1.6">With love,<br/>Yara — your AI from {{business_name}}</p>
</div>
`

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, plan, credit_balance, auto_campaigns_enabled, auto_campaign_subject')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  if ((merchant.credit_balance ?? 0) < CREDIT_COSTS.email_sent) {
    return NextResponse.json({ ok: false, reason: 'insufficient_credits', balance: merchant.credit_balance })
  }

  // Find eligible customers not recently contacted
  const { data: allTargets } = await service
    .from('customers')
    .select('id, name, email, segment, control_group')
    .eq('merchant_id', merchant.id)
    .in('segment', ['at_risk', 'lapsed'])
    .not('email', 'is', null)
    .eq('control_group', false)

  if (!allTargets || allTargets.length === 0) {
    return NextResponse.json({ ok: false, reason: 'no_eligible_customers' })
  }

  const { data: recentSends } = await service
    .from('campaign_sends')
    .select('customer_id')
    .eq('merchant_id', merchant.id)
    .gte('sent_at', thirtyDaysAgo)

  const recentIds  = new Set((recentSends || []).map(s => s.customer_id))
  const freshTargets = allTargets.filter(c => !recentIds.has(c.id))

  if (freshTargets.length === 0) {
    return NextResponse.json({ ok: false, reason: 'all_contacted_recently' })
  }

  const subject = (merchant.auto_campaign_subject || 'We miss you at {{business_name}}')
    .replace(/\{\{business_name\}\}/g, merchant.business_name)

  const { data: campaign } = await service.from('campaigns').insert({
    merchant_id:     merchant.id,
    name:            `Yara Auto Test — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    subject,
    body_html:       DEFAULT_BODY_HTML,
    segment_targets: ['at_risk', 'lapsed'],
    status:          'sending',
  }).select().single()

  if (!campaign) return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })

  // Control group records
  const { data: controlGroup } = await service
    .from('customers')
    .select('id')
    .eq('merchant_id', merchant.id)
    .in('segment', ['at_risk', 'lapsed'])
    .not('email', 'is', null)
    .eq('control_group', true)

  for (const ctrl of controlGroup || []) {
    await service.from('campaign_sends').insert({
      campaign_id: campaign.id, merchant_id: merchant.id,
      customer_id: ctrl.id, is_control_group: true, sent_at: null,
    })
  }

  let sent = 0
  for (const customer of freshTargets) {
    const firstName = (customer.name || '').split(' ')[0] || 'there'
    try {
      await sendWinBackEmail({
        to:           customer.email,
        customerName: customer.name || '',
        businessName: merchant.business_name,
        subject:      subject.replace(/\{\{first_name\}\}/g, firstName),
        bodyHtml:     DEFAULT_BODY_HTML
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{business_name\}\}/g, merchant.business_name),
      })
      await service.from('campaign_sends').insert({
        campaign_id: campaign.id, merchant_id: merchant.id,
        customer_id: customer.id, email: customer.email,
        is_control_group: false, sent_at: now.toISOString(),
      })
      sent++
    } catch (err: any) {
      console.error(`Yara test send failed for ${customer.email}:`, err?.message)
    }
  }

  if (sent > 0) await deductEmailBatch(merchant.id, sent, campaign.id)

  await service.from('campaigns').update({
    status: 'sent', total_sent: sent,
    total_control: controlGroup?.length ?? 0,
    sent_at: now.toISOString(), updated_at: now.toISOString(),
  }).eq('id', campaign.id)

  await service.from('merchants')
    .update({ last_auto_campaign_at: now.toISOString() })
    .eq('id', merchant.id)

  return NextResponse.json({
    ok: true,
    campaignId: campaign.id,
    sent,
    control: controlGroup?.length ?? 0,
    creditsUsed: sent * 2,
    subject,
  })
}
