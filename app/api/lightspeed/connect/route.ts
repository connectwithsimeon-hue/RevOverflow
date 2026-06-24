import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lightspeedOAuthBase } from '@/lib/lightspeed'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))
  }

  const clientId = process.env.LIGHTSPEED_CLIENT_ID!
  const redirectUrl = process.env.LIGHTSPEED_REDIRECT_URL!

  // State = the user's auth id so we can look them up in the callback
  const state = Buffer.from(user.id).toString('base64')

  const authUrl =
    `${lightspeedOAuthBase()}/connect` +
    `?response_type=code` +
    `&client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&state=${state}`

  return NextResponse.redirect(authUrl)
}
