import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  toastApiBase,
  getToastAccessToken,
  toastHeaders,
  mapToastCustomer,
  mapToastChecks,
  mapToastLineItems,
  businessDateRange,
  fetchToastPages,
  ToastCustomerRaw,
  ToastOrderRaw,
} from '@/lib/toast'
import { upsertPosCustomer } from '@/lib/customer-match'

// Toast's Orders API is per-business-date (one call per day, no date-range
// query), so a deep historical backfill is expensive. 90 days covers
// enough history to score customers meaningfully; the webhook keeps things
// current going forward.
const INITIAL_SYNC_DAYS = 90

export async function POST(request: NextRequest) {
  const { authUserId } = await request.json()
  if (!authUserId) return NextResponse.json({ error: 'Missing authUserId' }, { status: 400 })

  const service = createServiceClient()

  const { data: merchant, error: mErr } = await service
    .from('merchants')
    .select('id, toast_restaurant_guid')
    .eq('auth_user_id', authUserId)
    .single()

  if (mErr || !merchant || !merchant.toast_restaurant_guid) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const merchantId = merchant.id as string
  const restaurantGuid = merchant.toast_restaurant_guid as string
  const apiBase = toastApiBase()

  await service.from('merchants').update({ sync_status: 'in_progress', sync_progress: 0 }).eq('id', merchantId)

  try {
    const accessToken = await getToastAccessToken()
    const headers = toastHeaders(accessToken, restaurantGuid)

    // ── Sync customers ──
    const rawCustomers = await fetchToastPages<ToastCustomerRaw>(
      `${apiBase}/crm/v1/customers?pageSize=100`,
      headers
    )

    if (rawCustomers.length > 0) {
      // One-by-one (not a bulk upsert) so each customer can be merged
      // against an existing row from a different connected POS by
      // phone/email — keeps a merchant's customer base unified even when
      // Square, Clover, and Toast are all connected at once.
      for (const c of rawCustomers) {
        const mapped = mapToastCustomer(c)
        await upsertPosCustomer(service, merchantId, 'toast', {
          posCustomerId: mapped.toast_customer_id,
          name: mapped.name,
          email: mapped.email,
          phone: mapped.phone,
        })
      }
    }

    await service.from('merchants').update({ sync_progress: 20 }).eq('id', merchantId)

    // ── Sync orders (last 90 days, one Toast API call per business date) ──
    const dates = businessDateRange(INITIAL_SYNC_DAYS)
    let totalChecks = 0

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]
      const res = await fetch(`${apiBase}/orders/v2/orders?date=${date}`, { headers })
      if (!res.ok) {
        if (res.status !== 404) console.error('Toast orders fetch failed', date, res.status)
        continue // no orders that day, or transient error — keep going
      }
      const orders = (await res.json()) as ToastOrderRaw[]

      for (const o of orders) {
        const checks = mapToastChecks(o)

        for (const check of checks) {
          let customerId: string | null = null

          if (check.customerId) {
            const { data: cRow } = await service
              .from('customers')
              .select('id')
              .eq('merchant_id', merchantId)
              .eq('toast_customer_id', check.customerId)
              .maybeSingle()

            if (cRow?.id) {
              customerId = cRow.id
            } else if (check.customer) {
              // Customer appeared on an order but wasn't in the CRM list —
              // upsert it now, merged against any existing row from a
              // different connected POS by phone/email.
              const mapped = mapToastCustomer(check.customer as any)
              customerId = await upsertPosCustomer(service, merchantId, 'toast', {
                posCustomerId: mapped.toast_customer_id,
                name: mapped.name,
                email: mapped.email,
                phone: mapped.phone,
              })
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

          const lineItems = mapToastLineItems(o.checks!.find((c) => c.guid === check.toast_order_id)!)
          if (orderRow?.id && lineItems.length) {
            const items = lineItems.map((li) => ({ order_id: orderRow.id, merchant_id: merchantId, ...li }))
            await service.from('order_items').insert(items)
          }

          totalChecks++
        }
      }

      // progress ramps from 20% to 80% across the date range
      const pct = 20 + Math.round((i / dates.length) * 60)
      await service.from('merchants').update({ sync_progress: pct }).eq('id', merchantId)
    }

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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
    fetch(`${baseUrl}/api/rfv/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantId }),
    }).catch(console.error) // fire-and-forget

    return NextResponse.json({ ok: true, customers: rawCustomers.length, checks: totalChecks })

  } catch (err) {
    console.error('Toast sync error', err)
    await service.from('merchants').update({ sync_status: 'error' }).eq('id', merchantId)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
