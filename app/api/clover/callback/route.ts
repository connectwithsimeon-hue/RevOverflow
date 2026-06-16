import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encryption'
import { cloverOAuthBase } from '@/lib/clover'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const merchantId = searchParams.get('merchant_id')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/dashboard?clover_error=access_denied`)
  }

  // Recover user id from state
  let authUserId: string
  try {
    authUserId = Buffer.from(state, 'base64').toString('utf8')
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?clover_error=invalid_state`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch(`${cloverOAuthBase()}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.CLOVER_APP_ID,
      client_secret: process.env.CLOVER_APP_SECRET,
      code,
    }),
  })

  if (!tokenRes.ok) {
    console.error('Clover token exchange failed', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/dashboard?clover_error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()

  // Encrypt tokens before storage
  const encryptedAccess = encrypt(tokens.access_token)
  const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null
  const expiresAt = tokens.access_token_expiration ? new Date(tokens.access_token_expiration) : null

  const service = createServiceClient()

  const { error: updateError } = await service
    .from('merchants')
    .update({
      clover_merchant_id: merchantId,
      clover_access_token: encryptedAccess,
      clover_refresh_token: encryptedRefresh,
      clover_token_expires: expiresAt,
      sync_status: 'not_started',
      updated_at: new Date().toISOString(),
    })
    .eq('auth_user_id', authUserId)

  if (updateError) {
    console.error('Failed to save Clover tokens', updateError)
    return NextResponse.redirect(`${appUrl}/dashboard?clover_error=save_failed`)
  }

  // Kick off the data sync
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  fetch(`${baseUrl}/api/clover/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authUserId }),
  }).catch(console.error) // fire-and-forget

  return NextResponse.redirect(`${appUrl}/dashboard?clover_connected=true`)
}
