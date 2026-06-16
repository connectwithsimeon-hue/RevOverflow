/**
 * GET /api/benchmarks
 * Returns industry benchmarks + merchant context for the dashboard insights panel.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { computeIndustryBenchmarks, getMerchantBenchmarkContext } from '@/lib/benchmarks'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, industry')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const [benchmarks, context] = await Promise.all([
    computeIndustryBenchmarks(merchant.industry ?? null),
    getMerchantBenchmarkContext(merchant.id),
  ])

  return NextResponse.json({ benchmarks, context })
}
