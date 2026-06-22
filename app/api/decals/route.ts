/**
 * GET /api/decals
 * Returns the current merchant's decal/glass-print order history plus
 * whether they're eligible (any paid plan — decals are free with every
 * paid tier, matching how the admin panel already defines "paid":
 * plan !== 'starter').
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, plan')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const eligible = !!merchant.plan && merchant.plan !== 'starter'

  const { data: orders } = await service
    .from('decal_orders')
    .select('id, product_type, status, tracking_url, error_message, created_at')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ eligible, orders: orders ?? [] })
}
