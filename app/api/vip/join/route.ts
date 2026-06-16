/**
 * POST /api/vip/join
 * Called when a customer fills in the VIP signup form.
 *
 * Body: { slug, name, email?, phone? }
 *
 * 1. Finds the merchant by vip_slug
 * 2. Creates or updates the customer record
 * 3. If phone is given, kicks off SMS double opt-in
 * 4. Logs to outcome_log
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { initiateSmsDoulbeOptIn } from '@/lib/compliance'

export async function POST(request: NextRequest) {
  const { slug, name, email, phone } = await request.json()

  if (!slug || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!email && !phone) {
    return NextResponse.json({ error: 'Please provide an email or phone number' }, { status: 400 })
  }

  const service = createServiceClient()

  // Find merchant
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name')
    .eq('vip_slug', slug)
    .single()

  if (!merchant) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Normalise phone
  const normPhone = phone
    ? phone.replace(/[\s\-().]/g, '').replace(/^00/, '+')
    : null

  // Upsert customer
  const { data: customer } = await service
    .from('customers')
    .upsert({
      merchant_id:       merchant.id,
      name:              name.trim(),
      email:             email?.trim() || null,
      phone:             normPhone,
      segment:           'new',
      vip_signup:        true,
      vip_signed_up_at:  new Date().toISOString(),
      created_at:        new Date().toISOString(),
      updated_at:        new Date().toISOString(),
    }, {
      onConflict: email ? 'merchant_id,email' : 'merchant_id,phone',
      ignoreDuplicates: false,
    })
    .select('id')
    .single()

  // Log to outcome_log
  if (customer?.id) {
    await service.from('outcome_log').insert({
      merchant_id:  merchant.id,
      customer_id:  customer.id,
      action_type:  'vip_signup',
      channel:      phone ? 'sms' : 'email',
      metadata:     { source: 'qr_code', slug },
    })
  }

  // Initiate SMS double opt-in if phone provided
  let smsPending = false
  if (normPhone && customer?.id) {
    const result = await initiateSmsDoulbeOptIn({
      merchantId:   merchant.id,
      customerId:   customer.id,
      phone:        normPhone,
      businessName: merchant.business_name,
    })
    smsPending = result.ok
  }

  return NextResponse.json({
    ok:         true,
    customerId: customer?.id,
    smsPending,
  })
}
