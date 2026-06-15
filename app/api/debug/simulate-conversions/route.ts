/**
 * Demo conversion simulator — inserts post-campaign orders for some
 * campaign recipients so attribution has real data to show.
 *
 * Simulates a realistic ~40% conversion rate on the sent group
 * and ~15% on the control group.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

  // Get the most recent sent campaign
  const { data: campaign } = await service
    .from('campaigns')
    .select('id, sent_at')
    .eq('merchant_id', merchant.id)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(1)
    .single()

  if (!campaign || !campaign.sent_at) {
    return NextResponse.json({ error: 'No sent campaign found' }, { status: 404 })
  }

  // Get all sends for this campaign
  const { data: sends } = await service
    .from('campaign_sends')
    .select('id, customer_id, is_control_group')
    .eq('campaign_id', campaign.id)

  if (!sends || sends.length === 0) {
    return NextResponse.json({ error: 'No sends found for campaign' }, { status: 404 })
  }

  const sentGroup   = sends.filter(s => !s.is_control_group)
  const controlGroup = sends.filter(s => s.is_control_group)

  // Simulate ~40% conversion on sent group, ~15% on control
  const sentConverters   = sentGroup.slice(0, Math.ceil(sentGroup.length * 0.4))
  const controlConverters = controlGroup.slice(0, Math.ceil(controlGroup.length * 0.15))
  const converters = [...sentConverters, ...controlConverters]

  const sentAt = new Date(campaign.sent_at)
  let ordersInserted = 0

  for (let i = 0; i < converters.length; i++) {
    const send = converters[i]
    // Conversion happened 2-14 days after campaign send
    const daysAfter = 2 + (i % 12)
    const orderedAt = new Date(sentAt)
    orderedAt.setDate(orderedAt.getDate() + daysAfter)

    // Order values between $45-$140
    const amount = 45 + (i * 17 % 95)

    const { error } = await service.from('orders').insert({
      merchant_id: merchant.id,
      customer_id: send.customer_id,
      square_order_id: `demo_conv_${send.id}`,
      total_amount: amount,
      discount_amount: 0,
      location_id: 'demo_location',
      ordered_at: orderedAt.toISOString(),
    })

    if (!error) ordersInserted++
  }

  // Run attribution inline (no auth needed — we already verified merchant above)
  const { data: allSends } = await service
    .from('campaign_sends')
    .select('id, customer_id, sent_at, is_control_group, converted_at')
    .eq('campaign_id', campaign.id)

  let conversions = 0
  for (const send of allSends || []) {
    const baseline = send.sent_at || campaign.sent_at
    const { data: convOrders } = await service
      .from('orders')
      .select('id, total_amount, ordered_at')
      .eq('customer_id', send.customer_id)
      .eq('merchant_id', merchant.id)
      .gt('ordered_at', baseline)
      .order('ordered_at', { ascending: true })

    if (!convOrders || convOrders.length === 0) continue

    const conversionValue = convOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
    if (!send.converted_at) {
      await service.from('campaign_sends').update({
        converted_at: convOrders[0].ordered_at,
        conversion_value: conversionValue.toFixed(2),
      }).eq('id', send.id)
      conversions++
    }
  }

  return NextResponse.json({
    ok: true,
    campaignId: campaign.id,
    ordersInserted,
    sentConverters: sentConverters.length,
    controlConverters: controlConverters.length,
    conversionsAttributed: conversions,
  })
}
