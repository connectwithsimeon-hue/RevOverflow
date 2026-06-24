import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  fetch(`${appUrl}/api/lightspeed/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authUserId: user.id }),
  }).catch(console.error)

  return NextResponse.redirect(`${appUrl}/dashboard?syncing=1`)
}
