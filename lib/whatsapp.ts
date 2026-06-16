/**
 * WhatsApp delivery channel — via Telnyx WhatsApp Business API
 *
 * Same credentials as SMS — Telnyx manages the Meta Business account connection.
 *
 * Additional env vars required:
 *   TELNYX_WHATSAPP_NUMBER  — WhatsApp-enabled number in E.164 format
 *                             (distinct from the SMS number; set in Telnyx portal
 *                             under Messaging → WhatsApp → Business Profile)
 *
 * Telnyx uses the same /v2/messages endpoint — just set `type: "whatsapp"`.
 * Messages >4096 chars are truncated by Telnyx automatically.
 *
 * WhatsApp policy:
 *   - Business-initiated messages outside a 24-hour session window require
 *     a pre-approved Meta Message Template. Within a 24h window (after the
 *     customer last messaged you) any free-form text is allowed.
 *   - For initial outreach we use approved templates automatically identified
 *     by the TELNYX_WA_TEMPLATE_ID env var if set; otherwise freeform is used
 *     and may be rejected outside the 24h window.
 */

const TELNYX_API = 'https://api.telnyx.com/v2/messages'

export interface WhatsAppResult {
  ok: boolean
  messageId?: string
  error?: string
}

export async function sendWhatsApp({
  to,
  text,
}: {
  to: string
  text: string
}): Promise<WhatsAppResult> {
  const apiKey  = process.env.TELNYX_API_KEY
  const fromNum = process.env.TELNYX_WHATSAPP_NUMBER

  if (!apiKey || !fromNum) {
    return { ok: false, error: 'TELNYX_API_KEY or TELNYX_WHATSAPP_NUMBER not set' }
  }

  const normTo = to.replace(/[\s\-().]/g, '').replace(/^00/, '+')
  if (!normTo.startsWith('+')) {
    return { ok: false, error: `Invalid phone number: ${to}` }
  }

  // Truncate to WhatsApp body limit
  const body = text.length > 4096 ? text.slice(0, 4093) + '...' : text

  // If a pre-approved template ID is configured, use it for session-less outreach
  const templateId = process.env.TELNYX_WA_TEMPLATE_ID

  try {
    const payload: Record<string, unknown> = {
      from:          fromNum,
      to:            normTo,
      type:          'whatsapp',
      text:          body,
    }

    if (templateId) {
      // Template-based send — compliant for any outreach window
      payload.template = {
        id:         templateId,
        language:   { code: 'en_US' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: body }] },
        ],
      }
    }

    const res = await fetch(TELNYX_API, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok) {
      const errMsg = data?.errors?.[0]?.detail || data?.errors?.[0]?.title || 'Telnyx WhatsApp error'
      return { ok: false, error: errMsg }
    }

    return { ok: true, messageId: data?.data?.id }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/**
 * Format a campaign message for WhatsApp.
 * WhatsApp supports up to 4096 chars and limited markdown (bold = *text*, italic = _text_).
 * We strip HTML and optionally bold the merchant name.
 */
export function formatWhatsAppMessage({
  text,
  businessName,
  includeOptOut = true,
}: {
  text: string
  businessName: string
  includeOptOut?: boolean
}): string {
  // Strip any HTML tags that may have come from email body
  const stripped = text.replace(/<[^>]+>/g, '').replace(/\s{2,}/g, ' ').trim()

  const footer = includeOptOut
    ? `\n\nReply STOP to unsubscribe from ${businessName} messages.`
    : ''

  return stripped + footer
}
