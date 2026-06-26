import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isPaidPlan } from '@/lib/plans'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { enabled } = await request.json()

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, plan')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  // Autonomous Yara is included on every paid plan
  if (!isPaidPlan(merchant.plan)) {
    return NextResponse.json({
      error: 'Autonomous Yara requires a paid plan.',
      upgradeUrl: '/pricing',
    }, { status: 403 })
  }

  await service.from('merchants')
    .update({ auto_campaigns_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', merchant.id)

  return NextResponse.json({ ok: true, auto_campaigns_enabled: enabled })
}
