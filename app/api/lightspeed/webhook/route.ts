/**
 * POST /api/lightspeed/webhook
 *
 * Real-time sale notifications from Lightspeed X-Series. We look up the merchant
 * by their account's domain_prefix, fetch the sale, upsert it, and attribute the
 * revenue to a recent campaign — same model as Square/Clover/Toast.
 *
 * Webhook setup (X-Series): subscribe to "sale.update" pointing at this URL.
 * Lightspeed posts a JSON body that includes the retailer domain and the sale.
 *
 * NOTE: payload field names should be validated against a live Lightspeed
 * account; this handler is defensive about where the sale id / domain live.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import {
  lightspeedApiBase, lightspeedHeaders, mapLightspeedSale, mapLightspeedLineItems, LightspeedSaleRaw,
} from '@/lib/lightspeed'
import { attributeRevenueIfCampaignSent } from '@/lib/outcome'

export async function POST(request: NextRequest) {
  let event: Record<string, unknown>
  try {
    event = await request.json()
  } catch {
    return NextResponse.json({ ok: true }) // ack malformed payloads so they don't retry forever
  }

  // Domain prefix can arrive a few ways depending on the subscription config.
  const domainPrefix =
    (event.domain_prefix as string) ||
    (event.retailer as string) ||
    ((event.payload as Record<string, unknown>)?.domain_prefix as string) ||
    null

  // The sale object or its id.
  const payload = (event.payload ?? event) as Record<string, unknown>
  const saleId = (payload.id as string) || (payload.sale_id as string) || null

  if (!domainPrefix || !saleId) return NextResponse.json({ ok: true })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, lightspeed_domain_prefix, lightspeed_access_token')
    .eq('lightspeed_domain_prefix', domainPrefix)
    .single()

  if (!merchant?.lightspeed_access_token) return NextResponse.json({ ok: true })

  const merchantId = merchant.id as string
  const apiBase = lightspeedApiBase(domainPrefix)
  const headers = lightspeedHeaders(decrypt(merchant.lightspeed_access_token as string))

  // Fetch the full sale.
  const res = await fetch(`${apiBase}/api/2.0/sales/${saleId}`, { headers })
  if (!res.ok) return NextResponse.json({ ok: true })
  const json = await res.json()
  const sale: LightspeedSaleRaw = json.data ?? json
  const mapped = mapLightspeedSale(sale)

  // Resolve the customer.
  let customerId: string | null = null
  if (mapped.customerId) {
    const { data: cRow } = await service
      .from('customers')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('lightspeed_customer_id', mapped.customerId)
      .single()
    customerId = cRow?.id ?? null
  }

  // Upsert the order.
  const { data: orderRow } = await service
    .from('orders')
    .upsert({
      merchant_id: merchantId,
      customer_id: customerId,
      lightspeed_sale_id: mapped.lightspeed_sale_id,
      total_amount: mapped.total_amount,
      ordered_at: mapped.ordered_at,
    }, { onConflict: 'merchant_id,lightspeed_sale_id' })
    .select('id')
    .single()

  const lineItems = mapLightspeedLineItems(sale)
  if (orderRow?.id && lineItems.length) {
    await service.from('order_items').insert(
      lineItems.map((li) => ({ order_id: orderRow.id, merchant_id: merchantId, ...li })),
    )
  }

  // Attribute revenue if this customer was recently sent a campaign.
  if (customerId && mapped.total_amount > 0) {
    await attributeRevenueIfCampaignSent({
      merchantId,
      customerId,
      orderAmount: mapped.total_amount,
      orderedAt: mapped.ordered_at,
    })
  }

  return NextResponse.json({ ok: true })
}
