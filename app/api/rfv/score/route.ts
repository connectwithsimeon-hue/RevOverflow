import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { scoreCustomers } from '@/lib/rfv'

export async function POST(request: NextRequest) {
  const { merchantId } = await request.json()
  if (!merchantId) return NextResponse.json({ error: 'Missing merchantId' }, { status: 400 })

  const service = createServiceClient()

  // Verify merchant exists
  const { data: merchant, error: mErr } = await service
    .from('merchants')
    .select('id')
    .eq('id', merchantId)
    .single()

  if (mErr || !merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  // Load all customers with order data
  const { data: customers, error: cErr } = await service
    .from('customers')
    .select('id, total_orders, lifetime_value, avg_order_value, last_purchase_at, first_purchase_at')
    .eq('merchant_id', merchantId)

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 })
  }

  if (!customers || customers.length === 0) {
    return NextResponse.json({ ok: true, scored: 0 })
  }

  // Score all customers
  const scores = scoreCustomers(customers)

  // Batch update in chunks of 100
  const CHUNK = 100
  const entries = Array.from(scores.entries())
  let updated = 0

  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK)
    for (const [id, result] of chunk) {
      // Only update segment_changed_at if segment actually changed
      const existing = customers.find(c => c.id === id)
      const { error } = await service
        .from('customers')
        .update({
          rfv_recency: result.rfv_recency,
          rfv_frequency: result.rfv_frequency,
          rfv_value: result.rfv_value,
          rfv_score: result.rfv_score,
          segment: result.segment,
          segment_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (!error) updated++
    }
  }

  return NextResponse.json({ ok: true, scored: updated, total: customers.length })
}
