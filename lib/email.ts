export interface WinBackEmailOptions {
  to: string
  customerName: string
  businessName: string
  subject: string
  bodyHtml: string
}

export async function sendWinBackEmail(opts: WinBackEmailOptions) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Yara from ${opts.businessName} <onboarding@resend.dev>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.bodyHtml,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || `Resend error ${res.status}`)
  }

  return res.json()
}
