import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, credit_balance, credits_included, plan')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  // Last 10 ledger entries
  const { data: ledger } = await service
    .from('credit_ledger')
    .select('id, amount, action, description, created_at')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({
    balance:          merchant.credit_balance,
    included:         merchant.credits_included,
    plan:             merchant.plan,
    recentActivity:   ledger ?? [],
  })
}
