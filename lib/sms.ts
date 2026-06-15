/**
 * Telnyx SMS client
 * Docs: https://developers.telnyx.com/docs/messaging/send-and-receive-sms
 *
 * Env vars required:
 *   TELNYX_API_KEY       — V2 API key from Telnyx portal
 *   TELNYX_FROM_NUMBER   — Your Telnyx number in E.164 format, e.g. +12025551234
 */

const TELNYX_API = 'https://api.telnyx.com/v2/messages'

export interface SmsResult {
  ok: boolean
  messageId?: string
  error?: string
}

/**
 * Send a single SMS via Telnyx.
 * `to` must be E.164 format: +1XXXXXXXXXX
 */
export async function sendSms({
  to,
  text,
}: {
  to: string
  text: string
}): Promise<SmsResult> {
  const apiKey  = process.env.TELNYX_API_KEY
  const fromNum = process.env.TELNYX_FROM_NUMBER

  if (!apiKey || !fromNum) {
    return { ok: false, error: 'TELNYX_API_KEY or TELNYX_FROM_NUMBER not set' }
  }

  // Normalise number — strip spaces/dashes, ensure + prefix
  const normTo = to.replace(/[\s\-().]/g, '').replace(/^00/, '+')

  if (!normTo.startsWith('+')) {
    return { ok: false, error: `Invalid phone number format: ${to}` }
  }

  try {
    const res = await fetch(TELNYX_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromNum,
        to:   normTo,
        text,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      const errMsg = data?.errors?.[0]?.detail || data?.errors?.[0]?.title || 'Telnyx error'
      return { ok: false, error: errMsg }
    }

    return { ok: true, messageId: data?.data?.id }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/**
 * Build a win-back SMS body. Kept under 160 chars to avoid multi-part charges.
 */
export function buildWinBackSms({
  firstName,
  businessName,
}: {
  firstName: string
  businessName: string
}): string {
  const name = firstName || 'there'
  // Max ~155 chars to stay in one segment
  const text = `Hey ${name}! We miss you at ${businessName}. Come back and we'll make it worth your while. Reply STOP to opt out.`
  return text.length > 160 ? text.slice(0, 157) + '...' : text
}
