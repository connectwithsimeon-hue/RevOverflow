/**
 * RevOverflow — Campaign Attribution
 *
 * For each customer who received a campaign email, checks if they placed
 * an order AFTER the email was sent. If so, marks converted_at and
 * records the conversion value.
 *
 * Also checks control group customers the same way, so we can compare
 * conversion rates and calculate revenue lift.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const { data: merchant } = await service
    .from('merchants')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const { data: campaign } = await service
    .from('campaigns')
    .select('id, sent_at')
    .eq('id', params.id)
    .eq('merchant_id', merchant.id)
    .single()
  if (!campaign || !campaign.sent_at) {
    return NextResponse.json({ error: 'Campaign not found or not sent' }, { status: 404 })
  }

  // Load all sends for this campaign
  const { data: sends } = await service
    .from('campaign_sends')
    .select('id, customer_id, sent_at, is_control_group, converted_at')
    .eq('campaign_id', campaign.id)

  if (!sends || sends.length === 0) {
    return NextResponse.json({ ok: true, conversions: 0 })
  }

  let conversions = 0

  for (const send of sends) {
    // Use campaign sent_at as the baseline — look for orders after this
    const baseline = send.sent_at || campaign.sent_at

    // Find orders placed by this customer after the campaign was sent
    const { data: orders } = await service
      .from('orders')
      .select('id, total_amount, ordered_at')
      .eq('customer_id', send.customer_id)
      .eq('merchant_id', merchant.id)
      .gt('ordered_at', baseline)
      .order('ordered_at', { ascending: true })

    if (!orders || orders.length === 0) continue

    // Sum all post-campaign orders
    const conversionValue = orders.reduce(
      (sum, o) => sum + parseFloat(o.total_amount),
      0
    )
    const firstConversionAt = orders[0].ordered_at

    // Only update if not already attributed
    if (!send.converted_at) {
      await service
        .from('campaign_sends')
        .update({
          converted_at: firstConversionAt,
          conversion_value: conversionValue.toFixed(2),
        })
        .eq('id', send.id)

      conversions++
    }
  }

  return NextResponse.json({ ok: true, conversions, totalSends: sends.length })
}
