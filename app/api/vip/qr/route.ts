/**
 * GET /api/vip/qr
 * Returns a QR code PNG for the merchant's VIP signup page.
 * The QR code points to: https://revoverflow.com/vip/[merchantSlug]
 *
 * Uses the qrcode npm package (install: npm install qrcode @types/qrcode)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import QRCode from 'qrcode'
import { ensureVipSlug } from '@/lib/vip-slug'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, vip_slug, business_name')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  // Auto-generate a slug if the merchant doesn't have one yet
  const slug = await ensureVipSlug(service, merchant)

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://revoverflow.com'
  const vipUrl  = `${appUrl}/vip/${slug}`

  const format = request.nextUrl.searchParams.get('format') || 'png'

  if (format === 'svg') {
    const svg = await QRCode.toString(vipUrl, { type: 'svg', width: 300, margin: 2 })
    return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=3600' } })
  }

  // Default: PNG buffer
  const buffer = await QRCode.toBuffer(vipUrl, {
    type:   'png',
    width:  512,
    margin: 2,
    color:  { dark: '#1a1b2e', light: '#ffffff' },
  })

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'image/png',
      'Content-Disposition': `inline; filename="yara-vip-qr-${slug}.png"`,
      'Cache-Control':       'public, max-age=3600',
    },
  })
}
