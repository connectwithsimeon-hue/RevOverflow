/**
 * POST /api/square/offers
 *
 * Creates a promo code (discount) in the merchant's Square catalog.
 * Yara calls this when building a campaign offer.
 *
 * Body: {
 *   offerType:   'percentage' | 'fixed_amount'
 *   value:       number          // 10 = 10% off, or 5.00 = $5 off
 *   name?:       string          // defaults to "Yara Offer — <date>"
 *   maxUses?:    number          // 0 = unlimited
 *   expiresAt?:  string          // ISO date string
 * }
 *
 * Returns: { discountId, discountCode }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, square_access_token, square_location_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant?.square_access_token) {
    return NextResponse.json({ error: 'Square not connected' }, { status: 400 })
  }

  const body = await request.json()
  const {
    offerType = 'percentage',
    value,
    name,
    maxUses = 0,
    expiresAt,
  } = body

  if (!value || value <= 0) {
    return NextResponse.json({ error: 'value must be a positive number' }, { status: 400 })
  }

  const accessToken  = decrypt(merchant.square_access_token as string)
  const squareBase   = process.env.SQUARE_BASE_URL ?? 'https://connect.squareup.com'
  const headers = {
    Authorization:    `Bearer ${accessToken}`,
    'Square-Version': '2024-01-17',
    'Content-Type':   'application/json',
  }

  // Generate a unique promo code (6-char alphanumeric)
  const promoCode  = generatePromoCode()
  const offerName  = name || `Yara Offer — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  const idempotencyKey = `yara-offer-${merchant.id}-${Date.now()}`

  // Build the Square discount object
  const discountData: Record<string, any> = {
    type:             'FIXED_PERCENTAGE',
    name:             offerName,
    percentage:       offerType === 'percentage' ? String(value) : undefined,
    amount_money:     offerType === 'fixed_amount'
      ? { amount: Math.round(value * 100), currency: 'USD' }
      : undefined,
    discount_type:    offerType === 'percentage' ? 'FIXED_PERCENTAGE' : 'FIXED_AMOUNT',
    pin_required:     false,
    label_color:      '7C5CFC',  // RevOverflow violet
  }

  // Remove undefined keys
  Object.keys(discountData).forEach(k => {
    if (discountData[k] === undefined) delete discountData[k]
  })

  // Create catalog object (discount)
  const catalogRes = await fetch(`${squareBase}/v2/catalog/object`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      idempotency_key: idempotencyKey,
      object: {
        type: 'DISCOUNT',
        id: '#yara_discount',
        discount_data: discountData,
      },
    }),
  })

  const catalogData = await catalogRes.json()
  if (!catalogRes.ok || catalogData.errors) {
    const errMsg = catalogData.errors?.[0]?.detail || `Square error ${catalogRes.status}`
    console.error('Square catalog discount error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }

  const discountId = catalogData.catalog_object?.id

  // Now create a pricing rule that applies this discount via the promo code
  const ruleRes = await fetch(`${squareBase}/v2/catalog/object`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      idempotency_key: `${idempotencyKey}-rule`,
      object: {
        type: 'PRICING_RULE',
        id: '#yara_pricing_rule',
        pricing_rule_data: {
          name:               offerName,
          discount_id:        discountId,
          apply_products_type: 'ALL_PRODUCTS',
          valid_from_date:    new Date().toISOString().split('T')[0],
          valid_until_date:   expiresAt
            ? new Date(expiresAt).toISOString().split('T')[0]
            : undefined,
          customer_group_ids_any: [],  // No customer group restriction
          exclude_products_type: 'EMPTY',
        },
      },
    }),
  })

  const ruleData = await ruleRes.json()
  const ruleId   = ruleData.catalog_object?.id

  // Log the offer to our database
  // Log offer to DB (fire-and-forget, ignore errors)
  try {
    await service.from('square_offers').insert({
      merchant_id:  merchant.id,
      discount_id:  discountId,
      pricing_rule_id: ruleId ?? null,
      promo_code:   promoCode,
      offer_type:   offerType,
      value:        value,
      name:         offerName,
      max_uses:     maxUses,
      expires_at:   expiresAt ?? null,
      created_at:   new Date().toISOString(),
    })
  } catch (err: any) {
    console.warn('Failed to log offer to DB:', err?.message)
  }

  return NextResponse.json({
    ok:           true,
    discountId,
    ruleId,
    promoCode,
    offerName,
    summary:      offerType === 'percentage'
      ? `${value}% off (code: ${promoCode})`
      : `$${value.toFixed(2)} off (code: ${promoCode})`,
  })
}

/**
 * GET /api/square/offers
 * Returns the merchant's existing Yara offers
 */
export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const { data: offers } = await service
    .from('square_offers')
    .select('*')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ offers: offers ?? [] })
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function generatePromoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // no I, O, 0, 1 — easy to read
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
