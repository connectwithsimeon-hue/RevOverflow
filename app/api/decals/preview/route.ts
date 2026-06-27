/**
 * GET /api/decals/preview?productType=table_decal|glass_print
 *
 * Returns the exact same print-ready SVG that /api/decals/order would
 * generate and send to Gelato — using the merchant's real business data
 * (their uploaded logo if set, their real VIP QR link) — so they can see
 * what's about to be printed before they submit an order. No mock/sample
 * data: this is the literal design that ships.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ensureVipSlug } from '@/lib/vip-slug'
import { generateDecalSvg, DecalProductType } from '@/lib/decal-design'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, vip_slug, logo_url')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const productType = (request.nextUrl.searchParams.get('productType') || 'table_decal') as DecalProductType
  if (productType !== 'table_decal' && productType !== 'glass_print' && productType !== 'review_card') {
    return NextResponse.json({ error: 'Invalid productType' }, { status: 400 })
  }

  const slug = await ensureVipSlug(service, merchant)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://revoverflow.com'
  const vipUrl = `${appUrl}/vip/${slug}`

  // Review card → Google review link (falls back to a sample so the preview
  // always renders even before the merchant connects their Google listing).
  let qrUrl = vipUrl
  if (productType === 'review_card') {
    const { data: rep } = await service.from('reputation').select('google_place_id').eq('merchant_id', merchant.id).maybeSingle()
    qrUrl = rep?.google_place_id
      ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(rep.google_place_id)}`
      : 'https://search.google.com/local/writereview?placeid=SAMPLE'
  }

  const svg = await generateDecalSvg({ businessName: merchant.business_name, vipUrl: qrUrl, productType, logoUrl: merchant.logo_url })

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      // Always fresh — the merchant may have just uploaded a new logo and
      // wants to see it reflected immediately.
      'Cache-Control': 'no-store',
    },
  })
}
