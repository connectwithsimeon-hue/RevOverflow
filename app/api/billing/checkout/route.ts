import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const PLANS: Record<string, { name: string; priceMonthly: number; description: string }> = {
  capture: { name: 'Capture',  priceMonthly: 97,   description: 'Data Capture — RFV scoring and customer segmentation' },
  core:    { name: 'Core',     priceMonthly: 297,  description: 'Core — Win-back campaigns + revenue attribution' },
  brain:   { name: 'Brain',    priceMonthly: 597,  description: 'Brain — Automated triggers + multi-location' },
  empire:  { name: 'Empire',   priceMonthly: 1197, description: 'Empire — White-glove onboarding + dedicated support' },
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan } = await request.json()
  if (!PLANS[plan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, stripe_customer_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  const planMeta = PLANS[plan]

  // Build Stripe Checkout session via API
  const body = new URLSearchParams({
    'mode': 'subscription',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][product_data][name]': `RevOverflow ${planMeta.name}`,
    'line_items[0][price_data][product_data][description]': planMeta.description,
    'line_items[0][price_data][recurring][interval]': 'month',
    'line_items[0][price_data][unit_amount]': String(planMeta.priceMonthly * 100),
    'line_items[0][quantity]': '1',
    'success_url': `${baseUrl}/dashboard?billing=success`,
    'cancel_url': `${baseUrl}/pricing`,
    'metadata[merchant_id]': merchant.id,
    'metadata[plan]': plan,
    'allow_promotion_codes': 'true',
  })

  // Add existing customer ID if we have one
  if (merchant.stripe_customer_id) {
    body.set('customer', merchant.stripe_customer_id)
  } else {
    body.set('customer_email', user.email || '')
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const session = await res.json()
  if (!res.ok) {
    console.error('Stripe error:', session)
    return NextResponse.json({ error: session.error?.message || 'Stripe error' }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
