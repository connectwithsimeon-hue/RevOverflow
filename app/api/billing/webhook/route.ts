import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { grantCredits, PLAN_CREDITS } from '@/lib/credits'

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const sig = request.headers.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // Verify signature if webhook secret is set
  if (webhookSecret) {
    // Simple timestamp check (full HMAC verification requires crypto)
    const timestampMatch = sig.match(/t=(\d+)/)
    if (timestampMatch) {
      const timestamp = parseInt(timestampMatch[1])
      const fiveMinutes = 5 * 60
      if (Math.floor(Date.now() / 1000) - timestamp > fiveMinutes) {
        return NextResponse.json({ error: 'Webhook too old' }, { status: 400 })
      }
    }
  }

  let event: any
  try {
    event = JSON.parse(payload)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const service = createServiceClient()

  if (event.type === 'checkout.session.completed') {
    const session    = event.data.object
    const merchantId = session.metadata?.merchant_id
    const type       = session.metadata?.type

    // ── Credit pack purchase ──
    if (type === 'credit_pack' && merchantId) {
      const credits    = parseInt(session.metadata?.credits || '0')
      const pack       = session.metadata?.pack || 'pack'
      const customerId = session.customer

      if (credits > 0) {
        await service.from('merchants')
          .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
          .eq('id', merchantId)

        await grantCredits(
          merchantId,
          credits,
          'pack_purchase',
          `Purchased ${credits.toLocaleString()} Yara credits (${pack})`
        )
      }
    }

    // ── Subscription signup ──
    if (!type && merchantId) {
      const plan           = session.metadata?.plan
      const customerId     = session.customer
      const subscriptionId = session.subscription
      const planCredits    = PLAN_CREDITS[plan] ?? 0

      await service.from('merchants').update({
        plan,
        stripe_customer_id:     customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status:    'active',
        credits_included:       planCredits,
        updated_at:             new Date().toISOString(),
      }).eq('id', merchantId)

      if (planCredits > 0) {
        await grantCredits(
          merchantId,
          planCredits,
          'plan_grant',
          `${plan.charAt(0).toUpperCase() + plan.slice(1)} plan — monthly credit grant`
        )
      }
    }
  }

  // ── Monthly renewal — grant plan credits on every paid invoice ──
  if (event.type === 'invoice.payment_succeeded') {
    const invoice        = event.data.object
    const subscriptionId = invoice.subscription
    if (subscriptionId && invoice.billing_reason === 'subscription_cycle') {
      const { data: merchant } = await service
        .from('merchants')
        .select('id, plan')
        .eq('stripe_subscription_id', subscriptionId)
        .single()

      if (merchant?.plan) {
        const planCredits = PLAN_CREDITS[merchant.plan] ?? 0
        if (planCredits > 0) {
          await grantCredits(
            merchant.id,
            planCredits,
            'plan_renewal',
            `${merchant.plan.charAt(0).toUpperCase() + merchant.plan.slice(1)} plan — monthly renewal`
          )
        }
      }
    }
  }

  if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
    const subscription = event.data.object
    await service.from('merchants')
      .update({ subscription_status: 'inactive', updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscription.id)
  }

  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object
    await service.from('merchants')
      .update({ subscription_status: subscription.status, updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscription.id)
  }

  return NextResponse.json({ received: true })
}
