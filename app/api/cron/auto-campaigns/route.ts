/**
 * Autonomous Yara — daily cron job
 *
 * Runs at 9am UTC every day (configured in vercel.json).
 * For every Brain/Empire merchant with auto_campaigns_enabled = true:
 *   1. Finds at_risk + lapsed customers with emails who haven't been
 *      contacted in the last 30 days
 *   2. Checks credit balance (needs at least 2 per email)
 *   3. Creates a campaign and sends personalised win-back emails
 *   4. Deducts credits, logs everything
 *   5. Sends a low-credit warning email to the merchant if balance < 50
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendWinBackEmail } from '@/lib/email'
import { deductEmailBatch, CREDIT_COSTS } from '@/lib/credits'

const DEFAULT_BODY_HTML = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #1a1a1a;">
  <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Hey {{first_name}}, we miss you! 👋</h2>
  <p style="color: #555; line-height: 1.7; margin-bottom: 1.5rem;">
    It's been a while since we've seen you at {{business_name}}, and we wanted to reach out personally.
  </p>
  <p style="color: #555; line-height: 1.7; margin-bottom: 1.5rem;">
    Your next visit means a lot to us. Come back and we'll make sure it's worth your while.
  </p>
  <a href="#" style="display: inline-block; background: #7C5CFC; color: #fff; padding: 0.875rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 700; margin-bottom: 1.5rem;">
    Come back & save
  </a>
  <p style="color: #999; font-size: 0.875rem; line-height: 1.6;">
    With love,<br/>
    Yara — your AI from {{business_name}}
  </p>
</div>
`

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or our own debug trigger)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const results: any[] = []
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Find all merchants eligible for autonomous campaigns
  const { data: merchants } = await service
    .from('merchants')
    .select('id, business_name, plan, credit_balance, auto_campaigns_enabled, auto_campaign_subject')
    .in('plan', ['brain', 'empire'])
    .eq('auto_campaigns_enabled', true)
    .eq('subscription_status', 'active')

  if (!merchants || merchants.length === 0) {
    return NextResponse.json({ ok: true, message: 'No eligible merchants', results: [] })
  }

  for (const merchant of merchants) {
    try {
      // Skip if credits too low for even 1 email
      if ((merchant.credit_balance ?? 0) < CREDIT_COSTS.email_sent) {
        results.push({ merchantId: merchant.id, skipped: true, reason: 'insufficient_credits' })

        // Send a low-credit warning to the merchant
        const { data: merchantUser } = await service
          .from('merchants')
          .select('auth_user_id')
          .eq('id', merchant.id)
          .single()

        if (merchantUser) {
          const { data: userData } = await service.auth.admin.getUserById(merchantUser.auth_user_id)
          if (userData?.user?.email) {
            await sendWinBackEmail({
              to: userData.user.email,
              customerName: merchant.business_name,
              businessName: 'RevOverflow',
              subject: 'Yara needs more credits to keep working',
              bodyHtml: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:2rem">
                  <h2>Yara has run out of credits ✦</h2>
                  <p>Your autonomous campaigns for <strong>${merchant.business_name}</strong> have paused because your Yara credit balance is too low.</p>
                  <p>Top up your credits so Yara can keep winning back lapsed customers for you.</p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing" style="display:inline-block;background:#7C5CFC;color:#fff;padding:0.875rem 2rem;border-radius:8px;text-decoration:none;font-weight:700">Buy Yara credits</a>
                </div>
              `,
            })
          }
        }
        continue
      }

      // Find at_risk + lapsed customers with email, not contacted in 30 days
      const { data: allTargets } = await service
        .from('customers')
        .select('id, name, email, segment, control_group')
        .eq('merchant_id', merchant.id)
        .in('segment', ['at_risk', 'lapsed'])
        .not('email', 'is', null)
        .eq('control_group', false)

      if (!allTargets || allTargets.length === 0) {
        results.push({ merchantId: merchant.id, skipped: true, reason: 'no_eligible_customers' })
        continue
      }

      // Exclude customers who received a campaign in the last 30 days
      const { data: recentSends } = await service
        .from('campaign_sends')
        .select('customer_id')
        .eq('merchant_id', merchant.id)
        .gte('sent_at', thirtyDaysAgo)

      const recentIds = new Set((recentSends || []).map(s => s.customer_id))
      const freshTargets = allTargets.filter(c => !recentIds.has(c.id))

      if (freshTargets.length === 0) {
        results.push({ merchantId: merchant.id, skipped: true, reason: 'all_contacted_recently' })
        continue
      }

      // Build subject from merchant template
      const subject = (merchant.auto_campaign_subject || 'We miss you at {{business_name}}')
        .replace(/\{\{business_name\}\}/g, merchant.business_name)

      // Create campaign row
      const { data: campaign } = await service.from('campaigns').insert({
        merchant_id:      merchant.id,
        name:             `Yara Auto — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        subject,
        body_html:        DEFAULT_BODY_HTML,
        segment_targets:  ['at_risk', 'lapsed'],
        status:           'sending',
      }).select().single()

      if (!campaign) {
        results.push({ merchantId: merchant.id, error: 'Failed to create campaign' })
        continue
      }

      // Add control group records (15% of all targets including control)
      const { data: controlGroup } = await service
        .from('customers')
        .select('id')
        .eq('merchant_id', merchant.id)
        .in('segment', ['at_risk', 'lapsed'])
        .not('email', 'is', null)
        .eq('control_group', true)

      for (const ctrl of controlGroup || []) {
        await service.from('campaign_sends').insert({
          campaign_id:      campaign.id,
          merchant_id:      merchant.id,
          customer_id:      ctrl.id,
          is_control_group: true,
          sent_at:          null,
        })
      }

      // Send emails
      let sent = 0
      for (const customer of freshTargets) {
        const firstName  = (customer.name || '').split(' ')[0] || 'there'
        const bodyHtml   = DEFAULT_BODY_HTML
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{business_name\}\}/g, merchant.business_name)
        const subjectOut = subject.replace(/\{\{first_name\}\}/g, firstName)

        try {
          await sendWinBackEmail({
            to:           customer.email,
            customerName: customer.name || '',
            businessName: merchant.business_name,
            subject:      subjectOut,
            bodyHtml,
          })

          await service.from('campaign_sends').insert({
            campaign_id:      campaign.id,
            merchant_id:      merchant.id,
            customer_id:      customer.id,
            email:            customer.email,
            is_control_group: false,
            sent_at:          now.toISOString(),
          })

          sent++
        } catch (err: any) {
          console.error(`Auto-campaign send failed for ${customer.email}:`, err?.message)
        }
      }

      // Deduct credits
      if (sent > 0) {
        await deductEmailBatch(merchant.id, sent, campaign.id)
      }

      // Mark campaign sent
      await service.from('campaigns').update({
        status:        'sent',
        total_sent:    sent,
        total_control: controlGroup?.length ?? 0,
        sent_at:       now.toISOString(),
        updated_at:    now.toISOString(),
      }).eq('id', campaign.id)

      // Update last_auto_campaign_at
      await service.from('merchants')
        .update({ last_auto_campaign_at: now.toISOString() })
        .eq('id', merchant.id)

      results.push({
        merchantId: merchant.id,
        business:   merchant.business_name,
        campaignId: campaign.id,
        sent,
        credits:    sent * CREDIT_COSTS.email_sent,
      })
    } catch (err: any) {
      results.push({ merchantId: merchant.id, error: err?.message || 'Unknown error' })
    }
  }

  return NextResponse.json({ ok: true, ran: now.toISOString(), results })
}
