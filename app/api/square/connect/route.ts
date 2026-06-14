import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL!))
  }

  const appId = process.env.SQUARE_APP_ID!
  const redirectUrl = process.env.SQUARE_REDIRECT_URL!
  const scopes = [
    'MERCHANT_PROFILE_READ',
    'ORDERS_READ',
    'CUSTOMERS_READ',
    'ITEMS_READ',
  ].join('+')

  // State = the user's auth id so we can look them up in the callback
  const state = Buffer.from(user.id).toString('base64')

  const authUrl =
    `https://connect.squareupsandbox.com/oauth2/authorize` +
    `?client_id=${appId}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&state=${state}`

  return NextResponse.redirect(authUrl)
}
