/**
 * GET /api/referral/link
 * Returns (or creates) the merchant's referral link token.
 * Each merchant gets one unique token; any customer who signs up via that
 * link is tagged as referred + the referrer gets credit in outcome_log.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, referral_token, vip_slug')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  let token = merchant.referral_token as string | null
  if (!token) {
    token = randomBytes(8).toString('hex')   // 16-char hex
    await service.from('merchants').update({ referral_token: token }).eq('id', merchant.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://revoverflow.com'
  const slug   = merchant.vip_slug || merchant.id.slice(0, 8)
  const link   = `${appUrl}/refer/${token}?slug=${slug}`

  return NextResponse.json({ token, link })
}
