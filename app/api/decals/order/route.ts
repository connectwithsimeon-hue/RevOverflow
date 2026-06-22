/**
 * POST /api/decals/order
 *
 * Free decal/glass-print fulfillment for any paid-plan merchant. Generates
 * a print-ready design (business name + the merchant's existing VIP QR
 * code), hosts it in Supabase Storage, and submits a real order to Gelato.
 *
 * Body: {
 *   productType: 'table_decal' | 'glass_print'
 *   shippingName, addressLine1, addressLine2?, city, state?, postCode,
 *   country, phone?, email
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ensureVipSlug } from '@/lib/vip-slug'
import { generateDecalSvg, DecalProductType } from '@/lib/decal-design'
import { createGelatoOrder, isGelatoConfigured } from '@/lib/gelato'

const DESIGN_BUCKET = 'decal-designs'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, plan, vip_slug')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  if (!merchant.plan || merchant.plan === 'starter') {
    return NextResponse.json({ error: 'In-store decals are included free with any paid plan. Upgrade to order one.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const productType: DecalProductType = body.productType
  if (productType !== 'table_decal' && productType !== 'glass_print') {
    return NextResponse.json({ error: 'productType must be table_decal or glass_print' }, { status: 400 })
  }

  const required = ['shippingName', 'addressLine1', 'city', 'postCode', 'country', 'email']
  for (const field of required) {
    if (!body[field] || typeof body[field] !== 'string') {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
    }
  }

  if (!isGelatoConfigured(productType)) {
    return NextResponse.json({
      error: 'Decal printing isn’t connected yet. This needs a Gelato API key and product ID configured in the app’s environment settings before orders can be submitted.',
    }, { status: 503 })
  }

  // 1. Make sure this merchant has a VIP signup QR (decals embed it)
  const slug = await ensureVipSlug(service, merchant)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://revoverflow.com'
  const vipUrl = `${appUrl}/vip/${slug}`

  // 2. Create the decal_orders row first (pending) so we have a stable id
  //    to use as Gelato's orderReferenceId.
  const { data: order, error: insertError } = await service
    .from('decal_orders')
    .insert({
      merchant_id: merchant.id,
      product_type: productType,
      status: 'pending',
      shipping_name: body.shippingName,
      shipping_address1: body.addressLine1,
      shipping_address2: body.addressLine2 || null,
      shipping_city: body.city,
      shipping_state: body.state || null,
      shipping_postcode: body.postCode,
      shipping_country: body.country,
      shipping_phone: body.phone || null,
      shipping_email: body.email,
    })
    .select('id')
    .single()

  if (insertError || !order) {
    return NextResponse.json({ error: 'Could not create order record' }, { status: 500 })
  }

  // 3. Generate the design and upload it somewhere Gelato can fetch via URL
  const svg = await generateDecalSvg({ businessName: merchant.business_name, vipUrl, productType })
  const path = `${merchant.id}/${order.id}.svg`

  // Bucket may not exist yet on a fresh project — create it (public, so
  // Gelato's servers can fetch the file) and ignore "already exists" errors.
  await service.storage.createBucket(DESIGN_BUCKET, { public: true }).catch(() => {})

  const { error: uploadError } = await service.storage
    .from(DESIGN_BUCKET)
    .upload(path, svg, { contentType: 'image/svg+xml', upsert: true })

  if (uploadError) {
    await service.from('decal_orders').update({ status: 'failed', error_message: 'Design upload failed' }).eq('id', order.id)
    return NextResponse.json({ error: 'Could not generate design file' }, { status: 500 })
  }

  const { data: { publicUrl: designUrl } } = service.storage.from(DESIGN_BUCKET).getPublicUrl(path)

  // 4. Split shipping name into first/last for Gelato (required separately)
  const nameParts = body.shippingName.trim().split(/\s+/)
  const firstName = nameParts[0] || merchant.business_name
  const lastName = nameParts.slice(1).join(' ') || '-'

  const result = await createGelatoOrder({
    orderReferenceId: order.id,
    customerReferenceId: merchant.id,
    productType,
    designUrl,
    shippingAddress: {
      firstName,
      lastName,
      companyName: merchant.business_name,
      addressLine1: body.addressLine1,
      addressLine2: body.addressLine2,
      city: body.city,
      state: body.state,
      postCode: body.postCode,
      country: body.country,
      email: body.email,
      phone: body.phone,
    },
  })

  if (!result.ok) {
    await service.from('decal_orders').update({ status: 'failed', error_message: result.error, design_url: designUrl }).eq('id', order.id)
    return NextResponse.json({ error: result.error || 'Gelato order failed' }, { status: 502 })
  }

  await service.from('decal_orders').update({
    status: 'submitted',
    gelato_order_id: result.gelatoOrderId,
    design_url: designUrl,
    updated_at: new Date().toISOString(),
  }).eq('id', order.id)

  return NextResponse.json({ ok: true, orderId: order.id, gelatoOrderId: result.gelatoOrderId })
}
