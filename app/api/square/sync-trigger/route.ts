import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!

  // Fire sync in the background, then redirect to dashboard
  fetch(`${baseUrl}/api/square/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authUserId: user.id }),
  }).catch(console.error)

  return NextResponse.redirect(new URL('/dashboard?syncing=1', request.url))
}
