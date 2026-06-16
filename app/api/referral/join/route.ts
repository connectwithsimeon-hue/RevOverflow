/**
 * POST /api/referral/join
 * Called when a referred customer submits the referral form.
 *
 * Body: { token, slug, name, email?, phone?, refCid? }
 *
 * 1. Validates the referral token → finds merchant
 * 2. Creates / updates the referred customer
 * 3. Initiates SMS double opt-in if phone provided
 * 4. Logs referral_join + (optionally) referral_sent to outcome_log
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { initiateSmsDoulbeOptIn } from '@/lib/compliance'

export async function POST(request: NextRequest) {
  const { token, slug, name, email, phone, refCid } = await request.json()

  if (!token || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!email && !phone) {
    return NextResponse.json({ error: 'Please provide an email or phone number' }, { status: 400 })
  }

  const service = createServiceClient()

  // Find merchant via referral_token
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name')
    .eq('referral_token', token)
    .single()

  if (!merchant) {
    return NextResponse.json({ error: 'Invalid referral link' }, { status: 404 })
  }

  // Normalise phone
  const normPhone = phone
    ? phone.replace(/[\s\-().]/g, '').replace(/^00/, '+')
    : null

  // Upsert the referred customer
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

  if (!customer?.id) {
    return NextResponse.json({ error: 'Could not create customer' }, { status: 500 })
  }

  // Log the referral join
  await service.from('outcome_log').insert({
    merchant_id: merchant.id,
    customer_id: customer.id,
    action_type: 'referral_join',
    channel:     phone ? 'sms' : 'email',
    metadata:    { token, slug, referred_by: refCid || null },
  })

  // If we know who referred them, log that too
  if (refCid) {
    await service.from('outcome_log').insert({
      merchant_id: merchant.id,
      customer_id: refCid,
      action_type: 'referral_sent',
      channel:     'referral',
      metadata:    { new_customer_id: customer.id },
    })
  }

  // SMS double opt-in
  let smsPending = false
  if (normPhone) {
    const result = await initiateSmsDoulbeOptIn({
      merchantId:   merchant.id,
      customerId:   customer.id,
      phone:        normPhone,
      businessName: merchant.business_name,
    })
    smsPending = result.ok
  }

  return NextResponse.json({ ok: true, customerId: customer.id, smsPending })
}
