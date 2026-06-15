/**
 * POST /api/square/webhook
 *
 * Receives real-time events from Square for all merchants.
 * Square sends a notification when an order is created or updated.
 *
 * Set up in Square Developer Dashboard:
 *   Webhook URL: https://www.revoverflow.com/api/square/webhook
 *   Events to subscribe: order.created, order.updated, payment.completed
 *
 * Environment variable needed:
 *   SQUARE_WEBHOOK_SIGNATURE_KEY — the signature key from Square webhook settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { WebhooksHelper } from 'square'
import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY

  // Verify signature in production
  if (signatureKey) {
    const sigHeader = request.headers.get('x-square-hmacsha256-signature') ?? ''
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/square/webhook`
    const valid = await WebhooksHelper.verifySignature({
      requestBody: rawBody,
      signatureHeader: sigHeader,
      signatureKey,
      notificationUrl: webhookUrl,
    })
    if (!valid) {
      console.error('Square webhook: invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let event: Record<string, any>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = event.type as string
  const merchantSquareId = event.merchant_id as string

  // Only handle order events
  if (!eventType?.startsWith('order.') && eventType !== 'payment.completed') {
    return NextResponse.json({ received: true, skipped: true })
  }

  const service = createServiceClient()

  // Find the merchant by their Square merchant ID
  const { data: merchant } = await service
    .from('merchants')
    .select('id, square_access_token')
    .eq('square_merchant_id', merchantSquareId)
    .single()

  if (!merchant) {
    // Not a RevOverflow merchant — ignore silently
    return NextResponse.json({ received: true, skipped: true })
  }

  const merchantId = merchant.id as string
  const accessToken = decrypt(merchant.square_access_token as string)

  // Get the order ID from the event payload
  const orderId =
    event.data?.object?.order?.id ??
    event.data?.object?.order_created?.order_id ??
    event.data?.object?.order_updated?.order_id ??
    event.data?.object?.payment?.order_id

  if (!orderId) {
    return NextResponse.json({ received: true, skipped: 'no_order_id' })
  }

  // Fetch the full order from Square
  const squareBase = process.env.SQUARE_BASE_URL ?? 'https://connect.squareup.com'
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Square-Version': '2024-01-17',
    'Content-Type': 'application/json',
  }

  const orderRes = await fetch(`${squareBase}/v2/orders/${orderId}`, { headers })
  if (!orderRes.ok) {
    console.error('Square webhook: failed to fetch order', orderId, orderRes.status)
    return NextResponse.json({ received: true, error: 'order_fetch_failed' })
  }

  const { order: o } = await orderRes.json()
  if (!o) return NextResponse.json({ received: true, skipped: 'empty_order' })

  // ── Ensure customer exists ──────────────────────────────────────────────
  let customerId: string | null = null
  if (o.customer_id) {
    // Try to find existing customer first
    const { data: existingCustomer } = await service
      .from('customers')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('square_customer_id', o.customer_id)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Fetch customer details from Square and create them
      const custRes = await fetch(`${squareBase}/v2/customers/${o.customer_id}`, { headers })
      if (custRes.ok) {
        const { customer: c } = await custRes.json()
        if (c) {
          const { data: newCustomer } = await service
            .from('customers')
            .upsert({
              merchant_id: merchantId,
              square_customer_id: c.id,
              name: [c.given_name, c.family_name].filter(Boolean).join(' ') || null,
              email: c.email_address || null,
              phone: c.phone_number || null,
              birthday: c.birthday || null,
              created_at: c.created_at,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'merchant_id,square_customer_id' })
            .select('id')
            .single()
          customerId = newCustomer?.id ?? null
        }
      }
    }
  }

  // ── Upsert the order ────────────────────────────────────────────────────
  const totalMoney = o.total_money?.amount ?? 0
  const discountMoney = o.total_discount_money?.amount ?? 0

  const { data: orderRow } = await service
    .from('orders')
    .upsert({
      merchant_id: merchantId,
      customer_id: customerId,
      square_order_id: o.id,
      total_amount: totalMoney / 100,
      discount_amount: discountMoney / 100,
      location_id: o.location_id,
      ordered_at: o.created_at,
    }, { onConflict: 'merchant_id,square_order_id' })
    .select('id')
    .single()

  // ── Upsert order items ──────────────────────────────────────────────────
  if (orderRow?.id && o.line_items?.length) {
    // Delete old items first (order may have been updated)
    await service.from('order_items').delete().eq('order_id', orderRow.id)

    const items = (o.line_items as any[]).map((li) => ({
      order_id: orderRow.id,
      merchant_id: merchantId,
      catalog_name: li.name || null,
      category: li.variation_name || null,
      quantity: parseInt(li.quantity) || 1,
      unit_price: (li.base_price_money?.amount ?? 0) / 100,
    }))
    await service.from('order_items').insert(items)
  }

  // ── Update customer aggregates ──────────────────────────────────────────
  if (customerId) {
    const { data: allOrders } = await service
      .from('orders')
      .select('total_amount, ordered_at')
      .eq('customer_id', customerId)
      .order('ordered_at', { ascending: true })

    if (allOrders && allOrders.length > 0) {
      const totalValue = allOrders.reduce((sum, ord) => sum + parseFloat(ord.total_amount), 0)
      const avgValue = totalValue / allOrders.length

      await service.from('customers').update({
        total_orders: allOrders.length,
        lifetime_value: totalValue.toFixed(2),
        avg_order_value: avgValue.toFixed(2),
        first_purchase_at: allOrders[0].ordered_at,
        last_purchase_at: allOrders[allOrders.length - 1].ordered_at,
        updated_at: new Date().toISOString(),
      }).eq('id', customerId)
    }
  }

  // ── Fire RFV scoring (fire-and-forget) ─────────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  fetch(`${baseUrl}/api/rfv/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId }),
  }).catch(console.error)

  console.log(`Square webhook: processed ${eventType} for merchant ${merchantId}, order ${orderId}`)
  return NextResponse.json({ received: true, orderId, customerId })
}
