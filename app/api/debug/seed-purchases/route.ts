/**
 * Demo purchase seeder — patches Supabase directly with realistic
 * last_purchase_at / total_orders / lifetime_value so RFV scoring
 * produces all 6 segments without needing Square order history.
 *
 * Hit GET /api/debug/seed-purchases once, then /api/debug/score to re-score.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// Matches the email → segment profile from the seed script
const PROFILES: Record<string, { lastDays: number; orders: number; ltv: number }> = {
  // Loyal
  'maria.thompson@email.com': { lastDays: 5,   orders: 8, ltv: 629 },
  'james.rivera@email.com':   { lastDays: 3,   orders: 7, ltv: 573 },
  'priya.kapoor@email.com':   { lastDays: 8,   orders: 6, ltv: 435 },
  'david.chen@email.com':     { lastDays: 12,  orders: 5, ltv: 496 },
  'sofia.martinez@email.com': { lastDays: 6,   orders: 9, ltv: 681 },
  // Active
  'alex.johnson@email.com':   { lastDays: 10,  orders: 3, ltv: 235 },
  'sarah.w@email.com':        { lastDays: 15,  orders: 3, ltv: 200 },
  'marcus.b@email.com':       { lastDays: 20,  orders: 3, ltv: 253 },
  'linda.davis@email.com':    { lastDays: 7,   orders: 2, ltv: 156 },
  'kevin.lee@email.com':      { lastDays: 25,  orders: 2, ltv: 198 },
  'nina.patel@email.com':     { lastDays: 18,  orders: 3, ltv: 218 },
  'omar.hassan@email.com':    { lastDays: 30,  orders: 2, ltv: 242 },
  // New
  'emma.scott@email.com':     { lastDays: 4,   orders: 1, ltv: 55  },
  'tyler.moore@email.com':    { lastDays: 9,   orders: 1, ltv: 88  },
  'aisha.j@email.com':        { lastDays: 14,  orders: 1, ltv: 42  },
  'ryan.white@email.com':     { lastDays: 21,  orders: 1, ltv: 76  },
  'fatima.ali@email.com':     { lastDays: 28,  orders: 1, ltv: 99  },
  // At Risk
  'chris.taylor@email.com':   { lastDays: 65,  orders: 3, ltv: 210 },
  'jess.a@email.com':         { lastDays: 72,  orders: 2, ltv: 201 },
  'mike.thomas@email.com':    { lastDays: 80,  orders: 3, ltv: 200 },
  'rachel.g@email.com':       { lastDays: 90,  orders: 2, ltv: 136 },
  'daniel.m@email.com':       { lastDays: 100, orders: 3, ltv: 253 },
  'amy.robinson@email.com':   { lastDays: 110, orders: 2, ltv: 143 },
  // Lapsed
  'brian.clark@email.com':    { lastDays: 130, orders: 3, ltv: 225 },
  'laura.lewis@email.com':    { lastDays: 150, orders: 2, ltv: 177 },
  'jason.walker@email.com':   { lastDays: 180, orders: 3, ltv: 232 },
  'megan.hall@email.com':     { lastDays: 200, orders: 2, ltv: 147 },
  'eric.allen@email.com':     { lastDays: 220, orders: 3, ltv: 221 },
  'hannah.y@email.com':       { lastDays: 240, orders: 2, ltv: 177 },
  'sam.king@email.com':       { lastDays: 300, orders: 2, ltv: 143 },
  // Lost
  'pat.wright@email.com':     { lastDays: 400, orders: 3, ltv: 235 },
  'robert.lopez@email.com':   { lastDays: 430, orders: 2, ltv: 143 },
  'karen.hill@email.com':     { lastDays: 480, orders: 3, ltv: 222 },
  'steven.s@email.com':       { lastDays: 520, orders: 2, ltv: 143 },
  'dorothy.g@email.com':      { lastDays: 580, orders: 2, ltv: 159 },
  'paul.adams@email.com':     { lastDays: 620, orders: 3, ltv: 221 },
  'betty.baker@email.com':    { lastDays: 680, orders: 2, ltv: 122 },
  'george.n@email.com':       { lastDays: 700, orders: 1, ltv: 99  },
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

  const { data: customers } = await service
    .from('customers')
    .select('id, email')
    .eq('merchant_id', merchant.id)

  let updated = 0
  let skipped = 0

  for (const c of customers || []) {
    const profile = PROFILES[c.email]
    if (!profile) { skipped++; continue }

    const { error } = await service
      .from('customers')
      .update({
        total_orders: profile.orders,
        lifetime_value: profile.ltv,
        avg_order_value: +(profile.ltv / profile.orders).toFixed(2),
        last_purchase_at: daysAgo(profile.lastDays),
        first_purchase_at: daysAgo(profile.lastDays + profile.orders * 30),
        updated_at: new Date().toISOString(),
      })
      .eq('id', c.id)

    if (!error) updated++
  }

  // Fire RFV scoring
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  await fetch(`${baseUrl}/api/rfv/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId: merchant.id }),
  })

  return NextResponse.json({ ok: true, updated, skipped, total: customers?.length ?? 0 })
}
