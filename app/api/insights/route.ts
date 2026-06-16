/**
 * GET /api/insights
 * Returns forecast + gap analysis for the dashboard insights panel.
 * Single endpoint to avoid multiple round trips from the client.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { computeRevenueForecast } from '@/lib/forecast'
import { computeGapAnalysis } from '@/lib/gap-analysis'

export const dynamic = 'force-dynamic'

export async function GET() {
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

  const forecast = await computeRevenueForecast(merchant.id)
  const gaps     = await computeGapAnalysis(merchant.id, forecast)

  return NextResponse.json({ forecast, gaps })
}
