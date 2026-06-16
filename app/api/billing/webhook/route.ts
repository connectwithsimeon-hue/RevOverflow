import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { grantCredits, PLAN_CREDITS } from '@/lib/credits'

/**
 * Verifies a Stripe webhook signature per Stripe's documented algorithm
 * (https://docs.stripe.com/webhooks#verify-manually), since the `stripe`
 * npm package isn't installed here (checkout/webhook calls use raw fetch).
 *
 * Header format: "t=<timestamp>,v1=<signature>[,v1=<signature>...]"
 * Expected signature = HMAC-SHA256(secret, `${timestamp}.${payload}`)
 *
 * Without this, anyone who knows a merchant_id could POST a fake
 * checkout.session.completed event and grant themselves credits/a
 * subscription for free — the previous version only checked the
 * timestamp and never validated the signature itself.
 */
function verifyStripeSignature(payload: string, sigHeader: string, secret: string): boolean {
  const parts = Object.fromEntries(
    sigHeader.split(',').map((p) => {
      const [k, v] = p.split('=')
      return [k, v]
    })
  )
  const timestamp = parts.t
  const signatures = sigHeader
    .split(',')
    .filter((p) => p.startsWith('v1='))
    .map((p) => p.slice(3))

  if (!timestamp || signatures.length === 0) return false

  const fiveMinutes = 5 * 60
  if (Math.floor(Date.now() / 1000) - parseInt(timestamp) > fiveMinutes) return false

  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')
  const expectedBuf = Buffer.from(expected, 'utf8')

  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, 'utf8')
    return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
  })
}

export async function POST(request: NextRequest) {
  const payload = await request.text()
  const sig = request.headers.get('stripe-signature') || ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  // Verify signature if webhook secret is set. In live mode this must be
  // configured (Stripe Dashboard → Webhooks → Signing secret) or every
  // event is rejected below.
  if (webhookSecret) {
    if (!verifyStripeSignature(payload, sig, webhookSecret)) {
      console.error('Stripe webhook: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
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
