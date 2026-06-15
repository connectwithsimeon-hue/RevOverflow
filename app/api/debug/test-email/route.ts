import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Yara <yara@revoverflow.com>',
      to: 'simeonononobi@gmail.com',
      subject: 'RevOverflow — Yara test email',
      html: '<p>This is a test from Yara. If you see this, email sending works!</p>',
    }),
  })

  const data = await res.json()
  return NextResponse.json({ httpStatus: res.status, resendResponse: data })
}
