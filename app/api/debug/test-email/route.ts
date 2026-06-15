import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Scan for any env var containing "resend" (case-insensitive)
  const resendVars: string[] = []
  for (const key of Object.keys(process.env)) {
    if (key.toLowerCase().includes('resend')) {
      resendVars.push(key) // name only, no value
    }
  }

  return NextResponse.json({
    resendRelatedVarsFound: resendVars,
    RESEND_API_KEY_present: !!process.env.RESEND_API_KEY,
  })
}
