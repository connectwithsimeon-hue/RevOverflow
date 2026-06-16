/**
 * GET /api/vip/merchant?slug=<merchantSlug>
 * Returns the merchant's public info for the VIP signup page.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('business_name, industry')
    .eq('vip_slug', slug)
    .single()

  if (!merchant) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ merchant })
}
