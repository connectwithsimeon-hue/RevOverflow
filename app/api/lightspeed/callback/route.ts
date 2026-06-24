import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/encryption'
import { lightspeedApiBase } from '@/lib/lightspeed'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const domainPrefix = searchParams.get('domain_prefix')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code || !state || !domainPrefix) {
    return NextResponse.redirect(`${appUrl}/dashboard?lightspeed_error=access_denied`)
  }

  let authUserId: string
  try {
    authUserId = Buffer.from(state, 'base64').toString('utf8')
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard?lightspeed_error=invalid_state`)
  }

  // Exchange code for tokens (X-Series token endpoint is on the account subdomain)
  const tokenRes = await fetch(`${lightspeedApiBase(domainPrefix)}/api/1.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.LIGHTSPEED_CLIENT_ID!,
      client_secret: process.env.LIGHTSPEED_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.LIGHTSPEED_REDIRECT_URL!,
    }),
  })

  if (!tokenRes.ok) {
    console.error('Lightspeed token exchange failed', await tokenRes.text())
    return NextResponse.redirect(`${appUrl}/dashboard?lightspeed_error=token_exchange_failed`)
  }

  const tokens = await tokenRes.json()
  const encryptedAccess = encrypt(tokens.access_token)
  const encryptedRefresh = tokens.refresh_token ? encrypt(tokens.refresh_token) : null
  const expiresAt = tokens.expires_in ? new Date(Date.now() + Number(tokens.expires_in) * 1000) : null

  const service = createServiceClient()
  const { error: updateError } = await service
    .from('merchants')
    .update({
      lightspeed_domain_prefix: domainPrefix,
      lightspeed_access_token: encryptedAccess,
      lightspeed_refresh_token: encryptedRefresh,
      lightspeed_token_expires: expiresAt,
      sync_status: 'not_started',
      updated_at: new Date().toISOString(),
    })
    .eq('auth_user_id', authUserId)

  if (updateError) {
    console.error('Failed to save Lightspeed tokens', updateError)
    return NextResponse.redirect(`${appUrl}/dashboard?lightspeed_error=save_failed`)
  }

  // Kick off the data sync (fire-and-forget)
  fetch(`${appUrl}/api/lightspeed/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authUserId }),
  }).catch(console.error)

  return NextResponse.redirect(`${appUrl}/dashboard?lightspeed_connected=true`)
}
