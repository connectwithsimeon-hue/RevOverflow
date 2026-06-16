import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import { cloverApiBase, cloverHeaders, mapCloverCustomer, mapCloverOrder, mapCloverLineItems, fetchAllPages, CloverCustomerRaw, CloverOrderRaw } from '@/lib/clover'

export async function POST(request: NextRequest) {
  const { authUserId } = await request.json()
  if (!authUserId) return NextResponse.json({ error: 'Missing authUserId' }, { status: 400 })

  const service = createServiceClient()

  const { data: merchant, error: mErr } = await service
    .from('merchants')
    .select('id, clover_merchant_id, clover_access_token')
    .eq('auth_user_id', authUserId)
    .single()

  if (mErr || !merchant || !merchant.clover_merchant_id) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const merchantId = merchant.id as string
  const cloverMerchantId = merchant.clover_merchant_id as string
  const accessToken = decrypt(merchant.clover_access_token as string)
  const headers = cloverHeaders(accessToken)
  const apiBase = cloverApiBase()

  await service.from('merchants').update({ sync_status: 'in_progress', sync_progress: 0 }).eq('id', merchantId)

  try {
    // ── Sync customers ──
    const rawCustomers = await fetchAllPages<CloverCustomerRaw>(
      (offset) => `${apiBase}/v3/merchants/${cloverMerchantId}/customers?expand=emailAddresses,phoneNumbers&limit=100&offset=${offset}`,
      headers,
      (json) => json.elements ?? []
    )

    if (rawCustomers.length > 0) {
      const rows = rawCustomers.map((c) => ({
        merchant_id: merchantId,
        ...mapCloverCustomer(c),
        updated_at: new Date().toISOString(),
      }))
      await service.from('customers').upsert(rows, { onConflict: 'merchant_id,clover_customer_id', ignoreDuplicates: false })
    }

    await service.from('merchants').update({ sync_progress: 30 }).eq('id', merchantId)

    // ── Sync orders (last 24 months) ──
    const since = new Date()
    since.setMonth(since.getMonth() - 24)
    const sinceMs = since.getTime()

    const rawOrders = await fetchAllPages<CloverOrderRaw>(
      (offset) => `${apiBase}/v3/merchants/${cloverMerchantId}/orders?expand=lineItems,customers&filter=createdTime>=${sinceMs}&limit=100&offset=${offset}`,
      headers,
      (json) => json.elements ?? []
    )

    let totalOrders = 0
    for (const o of rawOrders) {
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

      const lineItems = mapCloverLineItems(o)
      if (orderRow?.id && lineItems.length) {
        const items = lineItems.map((li) => ({
          order_id: orderRow.id,
          merchant_id: merchantId,
          ...li,
        }))
        await service.from('order_items').insert(items)
      }

      totalOrders++
    }

    await service.from('merchants').update({ sync_progress: 80 }).eq('id', merchantId)

    // ── Update customer aggregates from orders ──
    const { data: customerList } = await service.from('customers').select('id').eq('merchant_id', merchantId)
    for (const cust of customerList || []) {
      const { data: orders } = await service
        .from('orders')
        .select('total_amount, ordered_at')
        .eq('customer_id', cust.id)
        .order('ordered_at', { ascending: true })

      if (!orders || orders.length === 0) continue

      const totalValue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.total_amount), 0)
      const avgValue = totalValue / orders.length

      await service.from('customers').update({
        total_orders: orders.length,
        lifetime_value: totalValue.toFixed(2),
        avg_order_value: avgValue.toFixed(2),
        first_purchase_at: orders[0].ordered_at,
        last_purchase_at: orders[orders.length - 1].ordered_at,
        updated_at: new Date().toISOString(),
      }).eq('id', cust.id)
    }

    await service.from('merchants').update({
      sync_status: 'complete',
      sync_progress: 100,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', merchantId)

    // Fire RFV scoring automatically after sync completes
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
    fetch(`${baseUrl}/api/rfv/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId }),
    }).catch(console.error) // fire-and-forget

    return NextResponse.json({ ok: true, customers: rawCustomers.length, orders: totalOrders })

  } catch (err) {
    console.error('Clover sync error', err)
    await service.from('merchants').update({ sync_status: 'error' }).eq('id', merchantId)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
