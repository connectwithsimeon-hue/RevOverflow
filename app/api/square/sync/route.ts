import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'
import { upsertPosCustomer } from '@/lib/customer-match'

export async function POST(request: NextRequest) {
  const { authUserId } = await request.json()
  if (!authUserId) return NextResponse.json({ error: 'Missing authUserId' }, { status: 400 })

  const service = createServiceClient()

  // Load merchant
  const { data: merchant, error: mErr } = await service
    .from('merchants')
    .select('id, square_access_token')
    .eq('auth_user_id', authUserId)
    .single()

  if (mErr || !merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const merchantId = merchant.id as string
  const accessToken = decrypt(merchant.square_access_token as string)
  const squareBase = process.env.SQUARE_BASE_URL ?? 'https://connect.squareup.com'
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Square-Version': '2024-01-17',
    'Content-Type': 'application/json',
  }

  // Mark sync in progress
  await service.from('merchants').update({ sync_status: 'in_progress', sync_progress: 0 }).eq('id', merchantId)

  try {
    // ── Sync customers ──
    let customerCursor: string | undefined
    let totalCustomers = 0
    do {
      const body: Record<string, unknown> = { limit: 100 }
      if (customerCursor) body.cursor = customerCursor

      const res = await fetch(`${squareBase}/v2/customers/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: {}, limit: 100, cursor: customerCursor }),
      })
      const data = await res.json()
      const customers = data.customers || []
      customerCursor = data.cursor

      if (customers.length > 0) {
        // One-by-one (not a bulk upsert) so each customer can be merged
        // against an existing row from a different connected POS by
        // phone/email — keeps a merchant's customer base unified even when
        // Square, Clover, and Toast are all connected at once.
        for (const c of customers as Record<string, any>[]) {
          await upsertPosCustomer(service, merchantId, 'square', {
            posCustomerId: c.id,
            name: [c.given_name, c.family_name].filter(Boolean).join(' ') || null,
            email: c.email_address || null,
            phone: c.phone_number || null,
            birthday: c.birthday || null,
            createdAt: c.created_at,
          })
        }
        totalCustomers += customers.length
      }
    } while (customerCursor)

    await service.from('merchants').update({ sync_progress: 30 }).eq('id', merchantId)

    // ── Sync orders (last 24 months) ──
    const since = new Date()
    since.setMonth(since.getMonth() - 24)
    const sinceISO = since.toISOString()

    // Get all location IDs first
    const locRes = await fetch(`${squareBase}/v2/locations`, { headers })
    const locData = await locRes.json()
    const locationIds = (locData.locations || []).map((l: any) => l.id)

    if (locationIds.length === 0) {
      await service.from('merchants').update({ sync_status: 'complete', sync_progress: 100, last_synced_at: new Date().toISOString() }).eq('id', merchantId)
      return NextResponse.json({ ok: true, customers: totalCustomers, orders: 0 })
    }

    let orderCursor: string | undefined
    let totalOrders = 0
    do {
      const searchBody: Record<string, unknown> = {
        location_ids: locationIds,
        query: {
          filter: {
            date_time_filter: { created_at: { start_at: sinceISO } },
          },
          sort: { sort_field: 'CREATED_AT', sort_order: 'ASC' },
        },
        limit: 500,
      }
      if (orderCursor) searchBody.cursor = orderCursor

      const res = await fetch(`${squareBase}/v2/orders/search`, { method: 'POST', headers, body: JSON.stringify(searchBody) })
      const data = await res.json()
      const orders = data.orders || []
      orderCursor = data.cursor

      for (const o of orders) {
        // Resolve customer
        let customerId: string | null = null
        if (o.customer_id) {
          const { data: cRow } = await service
            .from('customers')
            .select('id')
            .eq('merchant_id', merchantId)
            .eq('square_customer_id', o.customer_id)
            .single()
          customerId = cRow?.id ?? null
        }

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

        if (orderRow?.id && o.line_items?.length) {
          const items = o.line_items.map((li: any) => ({
            order_id: orderRow.id,
            merchant_id: merchantId,
            catalog_name: li.name || null,
            category: li.variation_name || null,
            quantity: parseInt(li.quantity) || 1,
            unit_price: (li.base_price_money?.amount ?? 0) / 100,
          }))
          await service.from('order_items').insert(items)
        }

        totalOrders++
      }
    } while (orderCursor)

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

    return NextResponse.json({ ok: true, customers: totalCustomers, orders: totalOrders })

  } catch (err) {
    console.error('Sync error', err)
    await service.from('merchants').update({ sync_status: 'error' }).eq('id', merchantId)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
