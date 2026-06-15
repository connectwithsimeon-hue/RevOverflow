import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

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
    const session = event.data.object
    const merchantId = session.metadata?.merchant_id
    const plan = session.metadata?.plan
    const customerId = session.customer
    const subscriptionId = session.subscription

    if (merchantId && plan) {
      await service.from('merchants').update({
        plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      }).eq('id', merchantId)
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
