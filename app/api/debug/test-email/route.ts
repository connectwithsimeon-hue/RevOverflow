import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY is not set in environment variables' })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Yara <onboarding@resend.dev>',
      to: 'simeonononobi@gmail.com',
      subject: 'RevOverflow test email',
      html: '<p>This is a test from Yara. If you see this, email sending works!</p>',
    }),
  })

  const data = await res.json()

  return NextResponse.json({
    httpStatus: res.status,
    apiKeyPrefix: apiKey.slice(0, 8) + '...',
    resendResponse: data,
  })
}
