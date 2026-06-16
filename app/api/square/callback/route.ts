import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?square_error=access_denied`)
  }

  // Recover user id from state
  let authUserId: string
  try {
    authUserId = Buffer.from(state, 'base64').toString('utf8')
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?square_error=invalid_state`)
  }

  // Exchange code for tokens
  const squareBase = process.env.SQUARE_BASE_URL ?? 'https://connect.squareup.com'
  const tokenRes = await fetch(`${squareBase}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Square-Version': '2024-01-17' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APP_ID,
      client_secret: process.env.SQUARE_APP_SECRET,
      redirect_uri: process.env.SQUARE_REDIRECT_URL,
      grant_type: 'authorization_code',
      code,
    }),
  })

  if (!tokenRes.ok) {
    console.error('Square token exchange failed', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/dashboard?square_error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()

  // Encrypt tokens before storage
  const encryptedAccess = encrypt(tokens.access_token)
  const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at) : null

  const service = createServiceClient()

  const { error: updateError } = await service
    .from('merchants')
    .update({
      square_merchant_id: tokens.merchant_id,
      square_access_token: encryptedAccess,
      square_refresh_token: encryptedRefresh,
      square_token_expires: expiresAt,
      sync_status: 'not_started',
      updated_at: new Date().toISOString(),
    })
    .eq('auth_user_id', authUserId)

  if (updateError) {
    console.error('Failed to save Square tokens', updateError)
    return NextResponse.redirect(`${appUrl}/dashboard?square_error=save_failed`)
  }

  // Kick off the data sync
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  fetch(`${baseUrl}/api/square/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authUserId }),
  }).catch(console.error) // fire-and-forget

  return NextResponse.redirect(`${appUrl}/dashboard?square_connected=true`)
}
