/**
 * POST /api/toast/connect
 *
 * Toast has no merchant-facing OAuth redirect (see lib/toast.ts) — instead
 * the merchant pastes their Restaurant GUID into the form at
 * /dashboard/connect-toast, which POSTs here.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  }

  const { restaurantGuid } = await request.json()
  if (!restaurantGuid || typeof restaurantGuid !== 'string' || restaurantGuid.trim().length < 8) {
    return NextResponse.json({ error: 'Please enter a valid Toast Restaurant GUID.' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('merchants')
    .update({
      toast_restaurant_guid: restaurantGuid.trim(),
      sync_status: 'not_started',
      updated_at: new Date().toISOString(),
    })
    .eq('auth_user_id', user.id)

  if (error) {
    console.error('Failed to save Toast restaurant GUID', error)
    return NextResponse.json({ error: 'Could not save — try again.' }, { status: 500 })
  }

  // Kick off the data sync in the background
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  fetch(`${baseUrl}/api/toast/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authUserId: user.id }),
  }).catch(console.error)

  return NextResponse.json({ ok: true })
}
