/**
 * GET /api/guarantee/status
 * Returns the current merchant's 3× ROI guarantee status.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeGuaranteeStatus } from '@/lib/guarantee'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { createServiceClient } = await import('@/lib/supabase/server')
  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const status = await computeGuaranteeStatus(merchant.id)
  return NextResponse.json({ status })
}
