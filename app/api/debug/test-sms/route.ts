/**
 * Debug: send a single test SMS to verify Telnyx is wired up.
 * GET /api/debug/test-sms?to=+1XXXXXXXXXX
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/sms'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const to = request.nextUrl.searchParams.get('to')
  if (!to) return NextResponse.json({ error: 'Pass ?to=+1XXXXXXXXXX' }, { status: 400 })

  const result = await sendSms({
    to,
    text: `Test from RevOverflow ✦ — Yara SMS is working! TELNYX_FROM: ${process.env.TELNYX_FROM_NUMBER || 'NOT SET'}`,
  })

  return NextResponse.json(result)
}
