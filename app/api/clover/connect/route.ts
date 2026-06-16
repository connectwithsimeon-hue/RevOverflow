import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cloverOAuthBase } from '@/lib/clover'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))
  }

  const appId = process.env.CLOVER_APP_ID!
  const redirectUrl = process.env.CLOVER_REDIRECT_URL!

  // State = the user's auth id so we can look them up in the callback
  const state = Buffer.from(user.id).toString('base64')

  const authUrl =
    `${cloverOAuthBase()}/oauth/v2/authorize` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&state=${state}`

  return NextResponse.redirect(authUrl)
}
