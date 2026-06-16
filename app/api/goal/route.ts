/**
 * GET  /api/goal  — returns current goal progress
 * POST /api/goal  — sets a new goal { amount: number }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { computeGoalProgress } from '@/lib/goal-mode'

export const dynamic = 'force-dynamic'

async function getMerchant(userId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from('merchants')
    .select('id')
    .eq('auth_user_id', userId)
    .single()
  return data
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchant = await getMerchant(user.id)
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const progress = await computeGoalProgress(merchant.id)
  return NextResponse.json(progress)
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const merchant = await getMerchant(user.id)
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const body = await request.json()
  const amount = parseFloat(body.amount ?? '0')
  if (!amount || amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  const now = new Date()
  const goalMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const service = createServiceClient()
  await service
    .from('merchants')
    .update({
      goal_amount:  amount,
      goal_set_at:  now.toISOString(),
      goal_month:   goalMonth,
      goal_status:  'on_track',
    })
    .eq('id', merchant.id)

  const progress = await computeGoalProgress(merchant.id)
  return NextResponse.json(progress)
}
