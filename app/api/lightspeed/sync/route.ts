import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import {
  lightspeedApiBase, lightspeedHeaders, fetchAllVersioned,
  mapLightspeedCustomer, mapLightspeedSale, mapLightspeedLineItems,
  LightspeedCustomerRaw, LightspeedSaleRaw,
} from '@/lib/lightspeed'
import { upsertPosCustomer } from '@/lib/customer-match'

export async function POST(request: NextRequest) {
  const { authUserId } = await request.json()
  if (!authUserId) return NextResponse.json({ error: 'Missing authUserId' }, { status: 400 })

  const service = createServiceClient()
  const { data: merchant, error: mErr } = await service
    .from('merchants')
    .select('id, lightspeed_domain_prefix, lightspeed_access_token')
    .eq('auth_user_id', authUserId)
    .single()

  if (mErr || !merchant || !merchant.lightspeed_domain_prefix) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const merchantId = merchant.id as string
  const apiBase = lightspeedApiBase(merchant.lightspeed_domain_prefix as string)
  const headers = lightspeedHeaders(decrypt(merchant.lightspeed_access_token as string))

  await service.from('merchants').update({ sync_status: 'in_progress', sync_progress: 0 }).eq('id', merchantId)

  try {
    // ── Customers ──
    const rawCustomers = await fetchAllVersioned<LightspeedCustomerRaw>(apiBase, '/api/2.0/customers', headers)
    for (const c of rawCustomers) {
      const mapped = mapLightspeedCustomer(c)
      await upsertPosCustomer(service, merchantId, 'lightspeed', {
        posCustomerId: mapped.lightspeed_customer_id,
        name: mapped.name,
        email: mapped.email,
        phone: mapped.phone,
        birthday: mapped.birthday ?? undefined,
      })
    }
    await service.from('merchants').update({ sync_progress: 30 }).eq('id', merchantId)

    // ── Sales (orders) ──
    const rawSales = await fetchAllVersioned<LightspeedSaleRaw>(apiBase, '/api/2.0/sales', headers)
    let totalOrders = 0
    for (const s of rawSales) {
      const mapped = mapLightspeedSale(s)

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

      const lineItems = mapLightspeedLineItems(s)
      if (orderRow?.id && lineItems.length) {
        await service.from('order_items').insert(
          lineItems.map((li) => ({ order_id: orderRow.id, merchant_id: merchantId, ...li })),
        )
      }
      totalOrders++
    }

    await service.from('merchants').update({ sync_progress: 80 }).eq('id', merchantId)

    // ── Customer aggregates ──
    const { data: customerList } = await service.from('customers').select('id').eq('merchant_id', merchantId)
    for (const cust of customerList || []) {
      const { data: orders } = await service
        .from('orders')
        .select('total_amount, ordered_at')
        .eq('customer_id', cust.id)
        .order('ordered_at', { ascending: true })
      if (!orders || orders.length === 0) continue
      const totalValue = orders.reduce((sum: number, o: { total_amount: string }) => sum + parseFloat(o.total_amount), 0)
      await service.from('customers').update({
        total_orders: orders.length,
        lifetime_value: totalValue.toFixed(2),
        avg_order_value: (totalValue / orders.length).toFixed(2),
        first_purchase_at: orders[0].ordered_at,
        last_purchase_at: orders[orders.length - 1].ordered_at,
        updated_at: new Date().toISOString(),
      }).eq('id', cust.id)
    }

    await service.from('merchants').update({
      sync_status: 'complete', sync_progress: 100,
      last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', merchantId)

    // Fire RFV scoring after sync
    fetch(`${process.env.NEXT_PUBLIC_APP_URL!}/api/rfv/score`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId }),
    }).catch(console.error)

    return NextResponse.json({ ok: true, customers: rawCustomers.length, orders: totalOrders })
  } catch (err) {
    console.error('Lightspeed sync error', err)
    await service.from('merchants').update({ sync_status: 'error' }).eq('id', merchantId)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
