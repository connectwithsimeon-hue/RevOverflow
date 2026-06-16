/**
 * POST /api/clover/webhook
 *
 * Receives real-time order/customer change notifications from Clover for
 * all merchants. Set up in the Clover Developer Dashboard under your app's
 * "Webhooks" tab:
 *   Webhook URL: https://www.revoverflow.com/api/clover/webhook
 *
 * Clover's verification handshake: when you save the webhook URL, Clover
 * sends a POST with { verificationCode } and expects the same code echoed
 * back in the response body — handled below before any merchant lookup.
 *
 * Real notifications arrive as:
 *   { appId, merchants: { "<cloverMerchantId>": [{ objectId: "O:xxxx", type: "CREATE"|"UPDATE"|"DELETE", ts }] } }
 *
 * Note: unlike Square, Clover does not sign these payloads with an HMAC
 * header — the verification handshake above is the extent of the
 * authenticity check Clover's webhook system provides.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import { cloverApiBase, cloverHeaders, mapCloverOrder, mapCloverLineItems, CloverOrderRaw } from '@/lib/clover'
import { attributeRevenueIfCampaignSent } from '@/lib/outcome'

export async function POST(request: NextRequest) {
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ── Verification handshake ──────────────────────────────────────────────
  if (body.verificationCode && !body.merchants) {
    return NextResponse.json({ verificationCode: body.verificationCode })
  }

  const merchantsPayload = body.merchants as Record<string, { objectId: string; type: string }[]> | undefined
  if (!merchantsPayload) {
    return NextResponse.json({ received: true, skipped: true })
  }

  const service = createServiceClient()

  for (const [cloverMerchantId, events] of Object.entries(merchantsPayload)) {
    const orderEvents = events.filter((e) => e.objectId?.startsWith('O:') && e.type !== 'DELETE')
    if (orderEvents.length === 0) continue

    const { data: merchant } = await service
      .from('merchants')
      .select('id, clover_access_token')
      .eq('clover_merchant_id', cloverMerchantId)
      .single()

    if (!merchant) continue // not a RevOverflow merchant — ignore silently

    const merchantId = merchant.id as string
    const accessToken = decrypt(merchant.clover_access_token as string)
    const headers = cloverHeaders(accessToken)
    const apiBase = cloverApiBase()

    for (const e of orderEvents) {
      const orderId = e.objectId.slice(2) // strip "O:" prefix

      const orderRes = await fetch(
        `${apiBase}/v3/merchants/${cloverMerchantId}/orders/${orderId}?expand=lineItems,customers`,
        { headers }
      )
      if (!orderRes.ok) {
        console.error('Clover webhook: failed to fetch order', orderId, orderRes.status)
        continue
      }

      const o = (await orderRes.json()) as CloverOrderRaw
      if (!o?.id) continue

      const mapped = mapCloverOrder(o)

      let customerId: string | null = null
      if (mapped.customerId) {
        const { data: cRow } = await service
          .from('customers')
          .select('id')
          .eq('merchant_id', merchantId)
          .eq('clover_customer_id', mapped.customerId)
          .single()
        customerId = cRow?.id ?? null
      }

      const { data: orderRow } = await service
        .from('orders')
        .upsert({
          merchant_id: merchantId,
          customer_id: customerId,
          clover_order_id: mapped.clover_order_id,
          total_amount: mapped.total_amount,
          ordered_at: mapped.ordered_at,
        }, { onConflict: 'merchant_id,clover_order_id' })
        .select('id')
        .single()

      if (orderRow?.id) {
        await service.from('order_items').delete().eq('order_id', orderRow.id)
        const lineItems = mapCloverLineItems(o)
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

      if (customerId && mapped.total_amount > 0) {
        attributeRevenueIfCampaignSent({
          merchantId,
          customerId,
          orderAmount: mapped.total_amount,
          orderedAt: mapped.ordered_at,
        }).catch(console.error)
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
      fetch(`${baseUrl}/api/rfv/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId }),
      }).catch(console.error)

      console.log(`Clover webhook: processed order ${orderId} for merchant ${merchantId}`)
    }
  }

  return NextResponse.json({ received: true })
}

// Clover may also probe the URL with a GET during setup in some flows.
export async function GET() {
  return NextResponse.json({ ok: true })
}
