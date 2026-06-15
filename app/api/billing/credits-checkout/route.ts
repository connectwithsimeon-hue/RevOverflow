import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const CREDIT_PACKS: Record<string, { credits: number; price: number; label: string }> = {
  pack_1000:  { credits: 1000,  price: 15,  label: '1,000 Yara Credits' },
  pack_5000:  { credits: 5000,  price: 60,  label: '5,000 Yara Credits' },
  pack_15000: { credits: 15000, price: 150, label: '15,000 Yara Credits' },
  pack_50000: { credits: 50000, price: 400, label: '50,000 Yara Credits' },
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pack } = await request.json()
  if (!CREDIT_PACKS[pack]) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, stripe_customer_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const packMeta  = CREDIT_PACKS[pack]
  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL!

  const body = new URLSearchParams({
    'mode':                                          'payment',
    'line_items[0][price_data][currency]':           'usd',
    'line_items[0][price_data][product_data][name]': packMeta.label,
    'line_items[0][price_data][product_data][description]': `${packMeta.credits.toLocaleString()} credits added to your RevOverflow account`,
    'line_items[0][price_data][unit_amount]':        String(packMeta.price * 100),
    'line_items[0][quantity]':                       '1',
    'success_url':                                   `${baseUrl}/dashboard?credits=purchased`,
    'cancel_url':                                    `${baseUrl}/pricing`,
    'metadata[merchant_id]':                         merchant.id,
    'metadata[pack]':                                pack,
    'metadata[credits]':                             String(packMeta.credits),
    'metadata[type]':                                'credit_pack',
  })

  if (merchant.stripe_customer_id) {
    body.set('customer', merchant.stripe_customer_id)
  } else {
    body.set('customer_email', user.email || '')
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type':   'application/x-www-form-urlencoded',
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
