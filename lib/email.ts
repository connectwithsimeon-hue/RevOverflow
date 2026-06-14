import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface WinBackEmailOptions {
  to: string
  customerName: string
  businessName: string
  subject: string
  bodyHtml: string
}

export async function sendWinBackEmail(opts: WinBackEmailOptions) {
  const { data, error } = await resend.emails.send({
    from: `Yara from ${opts.businessName} <onboarding@resend.dev>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.bodyHtml,
  })

  if (error) throw new Error(error.message)
  return data
}
