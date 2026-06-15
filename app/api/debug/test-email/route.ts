import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // List which of our expected env vars are present (values hidden)
  const vars = [
    'RESEND_API_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_KEY',
    'NEXT_PUBLIC_APP_URL',
  ]

  const present: Record<string, boolean> = {}
  for (const v of vars) {
    present[v] = !!process.env[v]
  }

  return NextResponse.json({ environmentVariablesPresent: present })
}
