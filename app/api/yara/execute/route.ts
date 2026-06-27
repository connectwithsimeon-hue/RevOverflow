/**
 * POST /api/yara/execute  { trigger }
 *
 * One-tap "Approve" from the dashboard. Builds and SENDS the campaign for the
 * given trigger immediately, using the same path as autonomous Yara. Returns
 * how many messages went out and the estimated revenue.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { executeTrigger, TRIGGER_CONFIGS } from '@/lib/autonomous'
import { isPaidPlan } from '@/lib/plans'
import type { TriggerType } from '@/lib/yara'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const trigger = body.trigger as TriggerType
  if (!trigger || !(trigger in TRIGGER_CONFIGS)) {
    return NextResponse.json({ error: 'Invalid or missing trigger' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data: merchant } = await service.from('merchants').select('id, plan').eq('auth_user_id', user.id).single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })
  if (!isPaidPlan(merchant.plan)) {
    return NextResponse.json({ error: 'Sending requires a paid plan.', upgradeUrl: '/pricing' }, { status: 403 })
  }

  const result = await executeTrigger(merchant.id, trigger)

  if (!result.ok) {
    const msg = result.error === 'insufficient_credits'
      ? 'You’re out of Yara credits. Top up to send.'
      : result.error || 'Could not send right now.'
    return NextResponse.json({ ok: false, error: msg, code: result.error }, { status: result.error === 'insufficient_credits' ? 402 : 500 })
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent ?? 0,
    estRevenue: result.estRevenue ?? 0,
    reason: result.reason,
  })
}
