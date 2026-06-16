/**
 * POST /api/toast/webhook
 *
 * Receives real-time order notifications from Toast for all merchants.
 * Configured in the Toast partner dashboard when the webhook subscription
 * is set up (done on Toast's side once they approve the integration):
 *   Webhook URL: https://www.revoverflow.com/api/toast/webhook
 *
 * Toast webhook payloads vary by event type, but order events carry at
 * minimum: { eventCategory, code, entityType: "ORDER", guid, restaurantGuid }
 *
 * Unlike Square, Toast doesn't HMAC-sign these payloads — instead a static
 * shared secret is sent back in a header you configure when registering
 * the subscription. If TOAST_WEBHOOK_SECRET is set, we require it to match;
 * if it's not set yet, we skip the check rather than reject every event.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { toastApiBase, getToastAccessToken, toastHeaders, mapToastChecks, mapToastLineItems, ToastOrderRaw } from '@/lib/toast'
import { attributeRevenueIfCampaignSent } from '@/lib/outcome'

export async function POST(request: NextRequest) {
  const configuredSecret = process.env.TOAST_WEBHOOK_SECRET
  if (configuredSecret) {
    const provided = request.headers.get('toast-webhook-signature')
    if (provided !== configuredSecret) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const restaurantGuid = body.restaurantGuid as string | undefined
  const orderGuid = body.guid as string | undefined
  const entityType = body.entityType as string | undefined

  if (!restaurantGuid || !orderGuid || entityType !== 'ORDER') {
    return NextResponse.json({ received: true, skipped: true })
  }

  const service = createServiceClient()

  const { data: merchant } = await service
    .from('merchants')
    .select('id')
    .eq('toast_restaurant_guid', restaurantGuid)
    .single()

  if (!merchant) return NextResponse.json({ received: true, skipped: true }) // not a RevOverflow merchant

  const merchantId = merchant.id as string

  try {
    const accessToken = await getToastAccessToken()
    const headers = toastHeaders(accessToken, restaurantGuid)
    const apiBase = toastApiBase()

    const orderRes = await fetch(`${apiBase}/orders/v2/orders/${orderGuid}`, { headers })
    if (!orderRes.ok) {
      console.error('Toast webhook: failed to fetch order', orderGuid, orderRes.status)
      return NextResponse.json({ received: true, error: 'fetch_failed' })
    }

    const o = (await orderRes.json()) as ToastOrderRaw
    const checks = mapToastChecks(o)

    for (const check of checks) {
      let customerId: string | null = null

      if (check.customerId) {
        const { data: cRow } = await service
          .from('customers')
          .select('id')
          .eq('merchant_id', merchantId)
          .eq('toast_customer_id', check.customerId)
          .single()

        if (cRow?.id) {
          customerId = cRow.id
        } else if (check.customer) {
          const { data: newCust } = await service
            .from('customers')
            .upsert({
              merchant_id: merchantId,
              toast_customer_id: check.customer.guid,
              name: [check.customer.firstName, check.customer.lastName].filter(Boolean).join(' ') || null,
              email: check.customer.email || null,
              phone: check.customer.phone || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'merchant_id,toast_customer_id' })
            .select('id')
            .single()
          customerId = newCust?.id ?? null
        }
      }

      const { data: orderRow } = await service
        .from('orders')
        .upsert({
          merchant_id: merchantId,
          customer_id: customerId,
          toast_order_id: check.toast_order_id,
          total_amount: check.total_amount,
          ordered_at: check.ordered_at,
        }, { onConflict: 'merchant_id,toast_order_id' })
        .select('id')
        .single()

      if (orderRow?.id) {
        await service.from('order_items').delete().eq('order_id', orderRow.id)
        const sourceCheck = o.checks?.find((c) => c.guid === check.toast_order_id)
        const lineItems = sourceCheck ? mapToastLineItems(sourceCheck) : []
        if (lineItems.length) {
          const items = lineItems.map((li) => ({ order_id: orderRow.id, merchant_id: merchantId, ...li }))
          await service.from('order_items').insert(items)
        }
      }

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

      if (customerId && check.total_amount > 0) {
        attributeRevenueIfCampaignSent({
          merchantId,
          customerId,
          orderAmount: check.total_amount,
          orderedAt: check.ordered_at,
        }).catch(console.error)
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
    fetch(`${baseUrl}/api/rfv/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId }),
    }).catch(console.error)

    console.log(`Toast webhook: processed order ${orderGuid} (${checks.length} checks) for merchant ${merchantId}`)
    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('Toast webhook error', err)
    return NextResponse.json({ received: true, error: 'processing_failed' })
  }
}

// Toast may probe the URL with a GET during webhook setup.
export async function GET() {
  return NextResponse.json({ ok: true })
}
