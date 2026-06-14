/**
 * RevOverflow — Demo Data Seeder
 *
 * Inserts realistic orders directly into Supabase with backdated ordered_at
 * timestamps. This is required because Square sandbox cannot backdate orders.
 *
 * For real merchants, the Square sync populates the same orders table —
 * so this endpoint only exists for sandbox demo purposes.
 *
 * Safe to run multiple times — existing demo orders are deleted first.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// Full order history per customer, matching the original seed script intent
const CUSTOMER_ORDERS: Record<string, { daysAgo: number; amount: number }[]> = {
  // ── Loyal ──
  'maria.thompson@email.com': [
    { daysAgo: 5,   amount: 68  },
    { daysAgo: 18,  amount: 92  },
    { daysAgo: 35,  amount: 45  },
    { daysAgo: 62,  amount: 78  },
    { daysAgo: 90,  amount: 110 },
    { daysAgo: 120, amount: 55  },
    { daysAgo: 145, amount: 82  },
    { daysAgo: 200, amount: 99  },
  ],
  'james.rivera@email.com': [
    { daysAgo: 3,   amount: 112 },
    { daysAgo: 22,  amount: 88  },
    { daysAgo: 41,  amount: 67  },
    { daysAgo: 70,  amount: 145 },
    { daysAgo: 95,  amount: 55  },
    { daysAgo: 130, amount: 90  },
    { daysAgo: 160, amount: 78  },
  ],
  'priya.kapoor@email.com': [
    { daysAgo: 8,   amount: 44  },
    { daysAgo: 30,  amount: 67  },
    { daysAgo: 55,  amount: 89  },
    { daysAgo: 80,  amount: 55  },
    { daysAgo: 110, amount: 102 },
    { daysAgo: 140, amount: 78  },
  ],
  'david.chen@email.com': [
    { daysAgo: 12,  amount: 95  },
    { daysAgo: 28,  amount: 134 },
    { daysAgo: 50,  amount: 67  },
    { daysAgo: 75,  amount: 88  },
    { daysAgo: 100, amount: 112 },
  ],
  'sofia.martinez@email.com': [
    { daysAgo: 6,   amount: 55  },
    { daysAgo: 25,  amount: 78  },
    { daysAgo: 48,  amount: 92  },
    { daysAgo: 72,  amount: 44  },
    { daysAgo: 98,  amount: 110 },
    { daysAgo: 125, amount: 67  },
    { daysAgo: 155, amount: 83  },
    { daysAgo: 180, amount: 59  },
    { daysAgo: 210, amount: 95  },
  ],
  // ── Active ──
  'alex.johnson@email.com': [
    { daysAgo: 10, amount: 78 },
    { daysAgo: 45, amount: 92 },
    { daysAgo: 90, amount: 65 },
  ],
  'sarah.w@email.com': [
    { daysAgo: 15, amount: 45 },
    { daysAgo: 50, amount: 67 },
    { daysAgo: 85, amount: 88 },
  ],
  'marcus.b@email.com': [
    { daysAgo: 20, amount: 120 },
    { daysAgo: 55, amount: 78  },
    { daysAgo: 95, amount: 55  },
  ],
  'linda.davis@email.com': [
    { daysAgo: 7,  amount: 67 },
    { daysAgo: 40, amount: 89 },
  ],
  'kevin.lee@email.com': [
    { daysAgo: 25, amount: 88  },
    { daysAgo: 58, amount: 110 },
  ],
  'nina.patel@email.com': [
    { daysAgo: 18, amount: 55 },
    { daysAgo: 52, amount: 72 },
    { daysAgo: 88, amount: 91 },
  ],
  'omar.hassan@email.com': [
    { daysAgo: 30, amount: 144 },
    { daysAgo: 65, amount: 98  },
  ],
  // ── New ──
  'emma.scott@email.com':  [{ daysAgo: 4,  amount: 55 }],
  'tyler.moore@email.com': [{ daysAgo: 9,  amount: 88 }],
  'aisha.j@email.com':     [{ daysAgo: 14, amount: 42 }],
  'ryan.white@email.com':  [{ daysAgo: 21, amount: 76 }],
  'fatima.ali@email.com':  [{ daysAgo: 28, amount: 99 }],
  // ── At Risk ──
  'chris.taylor@email.com': [
    { daysAgo: 65,  amount: 88 },
    { daysAgo: 120, amount: 67 },
    { daysAgo: 200, amount: 55 },
  ],
  'jess.a@email.com': [
    { daysAgo: 72,  amount: 112 },
    { daysAgo: 130, amount: 89  },
  ],
  'mike.thomas@email.com': [
    { daysAgo: 80,  amount: 67 },
    { daysAgo: 145, amount: 55 },
    { daysAgo: 220, amount: 78 },
  ],
  'rachel.g@email.com': [
    { daysAgo: 90,  amount: 44 },
    { daysAgo: 160, amount: 92 },
  ],
  'daniel.m@email.com': [
    { daysAgo: 100, amount: 78  },
    { daysAgo: 170, amount: 110 },
    { daysAgo: 240, amount: 65  },
  ],
  'amy.robinson@email.com': [
    { daysAgo: 110, amount: 55 },
    { daysAgo: 180, amount: 88 },
  ],
  // ── Lapsed ──
  'brian.clark@email.com': [
    { daysAgo: 130, amount: 92 },
    { daysAgo: 250, amount: 78 },
    { daysAgo: 380, amount: 55 },
  ],
  'laura.lewis@email.com': [
    { daysAgo: 150, amount: 67  },
    { daysAgo: 280, amount: 110 },
  ],
  'jason.walker@email.com': [
    { daysAgo: 180, amount: 88 },
    { daysAgo: 310, amount: 65 },
    { daysAgo: 430, amount: 79 },
  ],
  'megan.hall@email.com': [
    { daysAgo: 200, amount: 55 },
    { daysAgo: 350, amount: 92 },
  ],
  'eric.allen@email.com': [
    { daysAgo: 220, amount: 78 },
    { daysAgo: 370, amount: 44 },
    { daysAgo: 500, amount: 99 },
  ],
  'hannah.y@email.com': [
    { daysAgo: 240, amount: 110 },
    { daysAgo: 390, amount: 67  },
  ],
  'sam.king@email.com': [
    { daysAgo: 300, amount: 88 },
    { daysAgo: 450, amount: 55 },
  ],
  // ── Lost ──
  'pat.wright@email.com': [
    { daysAgo: 400, amount: 78 },
    { daysAgo: 550, amount: 92 },
    { daysAgo: 680, amount: 65 },
  ],
  'robert.lopez@email.com': [
    { daysAgo: 430, amount: 55 },
    { daysAgo: 600, amount: 88 },
  ],
  'karen.hill@email.com': [
    { daysAgo: 480, amount: 110 },
    { daysAgo: 630, amount: 67  },
    { daysAgo: 720, amount: 45  },
  ],
  'steven.s@email.com': [
    { daysAgo: 520, amount: 88 },
    { daysAgo: 670, amount: 55 },
  ],
  'dorothy.g@email.com': [
    { daysAgo: 580, amount: 67 },
    { daysAgo: 710, amount: 92 },
  ],
  'paul.adams@email.com': [
    { daysAgo: 620, amount: 78 },
    { daysAgo: 650, amount: 55 },
    { daysAgo: 730, amount: 88 },
  ],
  'betty.baker@email.com': [
    { daysAgo: 680, amount: 44 },
    { daysAgo: 750, amount: 78 },
  ],
  'george.n@email.com': [
    { daysAgo: 700, amount: 99 },
  ],
}

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const merchantId = merchant.id as string

  // Load all customers for this merchant
  const { data: customers } = await service
    .from('customers')
    .select('id, email')
    .eq('merchant_id', merchantId)

  let ordersInserted = 0
  let customersPatched = 0

  for (const c of customers || []) {
    const history = CUSTOMER_ORDERS[c.email]
    if (!history || history.length === 0) continue

    // Delete any previous demo orders for this customer
    await service
      .from('orders')
      .delete()
      .eq('customer_id', c.id)
      .like('square_order_id', 'demo_%')

    // Insert fresh order rows with backdated ordered_at
    const orderRows = history.map((o, i) => ({
      merchant_id: merchantId,
      customer_id: c.id,
      square_order_id: `demo_${c.id}_${i}`,
      total_amount: o.amount,
      discount_amount: 0,
      location_id: 'demo_location',
      ordered_at: daysAgo(o.daysAgo),
    }))

    const { error: insertErr } = await service.from('orders').insert(orderRows)
    if (insertErr) {
      console.error('order insert error', insertErr)
      continue
    }
    ordersInserted += orderRows.length

    // Recompute customer aggregates from the orders we just inserted
    const totalOrders = history.length
    const lifetimeValue = history.reduce((sum, o) => sum + o.amount, 0)
    const avgOrderValue = +(lifetimeValue / totalOrders).toFixed(2)
    const sortedDays = [...history].sort((a, b) => a.daysAgo - b.daysAgo)
    const lastPurchaseAt = daysAgo(sortedDays[0].daysAgo)
    const firstPurchaseAt = daysAgo(sortedDays[sortedDays.length - 1].daysAgo)

    await service.from('customers').update({
      total_orders: totalOrders,
      lifetime_value: lifetimeValue,
      avg_order_value: avgOrderValue,
      last_purchase_at: lastPurchaseAt,
      first_purchase_at: firstPurchaseAt,
      updated_at: new Date().toISOString(),
    }).eq('id', c.id)

    customersPatched++
  }

  // Run RFV scoring
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  const scoreRes = await fetch(`${baseUrl}/api/rfv/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId }),
  })
  const scoreData = await scoreRes.json()

  return NextResponse.json({
    ok: true,
    customersPatched,
    ordersInserted,
    rfvScored: scoreData.scored ?? 0,
  })
}
