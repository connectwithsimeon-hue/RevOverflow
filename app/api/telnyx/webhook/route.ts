/**
 * POST /api/telnyx/webhook
 *
 * Receives Telnyx messaging events:
 *   - message.finalized  → delivery receipt (delivered / failed)
 *   - message.received   → inbound SMS (STOP / HELP / START)
 *
 * Telnyx signs requests with the API key in the Authorization header.
 * For now we accept all events and handle opt-outs.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventType = body?.data?.event_type
  const payload   = body?.data?.payload

  // ── Inbound message (STOP / START / HELP opt-outs) ───────────────────────
  if (eventType === 'message.received') {
    const from = payload?.from?.phone_number as string | undefined
    const text = (payload?.text as string || '').trim().toUpperCase()

    if (from && (text === 'STOP' || text === 'UNSUBSCRIBE')) {
      const service = createServiceClient()
      // Mark customer as opted out so we never SMS them again
      await service
        .from('customers')
        .update({ sms_opt_out: true })
        .eq('phone', from)
      console.log(`[telnyx/webhook] STOP from ${from} — opted out`)
    }

    if (from && (text === 'START' || text === 'UNSTOP')) {
      const service = createServiceClient()
      await service
        .from('customers')
        .update({ sms_opt_out: false })
        .eq('phone', from)
      console.log(`[telnyx/webhook] START from ${from} — opted back in`)
    }
  }

  // ── Delivery receipt ──────────────────────────────────────────────────────
  if (eventType === 'message.finalized') {
    const status = payload?.to?.[0]?.status
    const msgId  = payload?.id
    console.log(`[telnyx/webhook] message.finalized id=${msgId} status=${status}`)
    // Future: update campaign_sends table with delivery status
  }

  // Always respond 200 so Telnyx doesn't retry
  return NextResponse.json({ received: true })
}
