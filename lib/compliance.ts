/**
 * Compliance Gate — RevOverflow
 *
 * Every outbound message (SMS, email, WhatsApp) must pass this gate
 * before it is sent. If it fails, the message is blocked and the
 * reason is logged.
 *
 * Rules enforced:
 *   1. Opt-out check     — customer has not opted out of this channel
 *   2. Rate limits       — max 1 SMS per 72 hours, 1 email per 7 days
 *   3. Quiet hours       — no messages outside 9am–9pm in customer's timezone
 *   4. Double opt-in     — SMS requires confirmed opt-in before first message
 */

import { createServiceClient } from '@/lib/supabase/server'
import { sendSms } from '@/lib/sms'

export type Channel = 'sms' | 'email' | 'whatsapp'

export interface ComplianceCheckInput {
  merchantId:  string
  customerId:  string
  channel:     Channel
  customerTz?: string   // IANA timezone, e.g. "America/New_York" — default Eastern
}

export interface ComplianceResult {
  allowed: boolean
  reason?: string       // human-readable reason if blocked
}

// Rate limits in hours
const RATE_LIMITS: Record<Channel, number> = {
  sms:       72,    // 1 SMS per 72 hours
  email:      7 * 24, // 1 email per 7 days
  whatsapp:  72,
}

// Quiet hours: 9am–9pm local time
const QUIET_HOUR_START = 9   // 9am
const QUIET_HOUR_END   = 21  // 9pm

export async function preCheckCompliance(
  input: ComplianceCheckInput
): Promise<ComplianceResult> {
  const service = createServiceClient()

  // Load customer record
  const { data: customer } = await service
    .from('customers')
    .select('sms_opt_out, email_opt_out, sms_double_opt_in, last_sms_sent_at, last_email_sent_at')
    .eq('id', input.customerId)
    .single()

  if (!customer) {
    return { allowed: false, reason: 'Customer not found' }
  }

  // ── 1. Opt-out check ────────────────────────────────────────────────────────
  if (input.channel === 'sms' && customer.sms_opt_out) {
    return { allowed: false, reason: 'Customer has opted out of SMS' }
  }
  if ((input.channel === 'email' || input.channel === 'whatsapp') && customer.email_opt_out) {
    return { allowed: false, reason: 'Customer has opted out of email' }
  }

  // ── 2. Double opt-in for SMS ─────────────────────────────────────────────────
  if (input.channel === 'sms' && !customer.sms_double_opt_in) {
    return { allowed: false, reason: 'SMS requires double opt-in — awaiting customer confirmation' }
  }

  // ── 3. Rate limit check ──────────────────────────────────────────────────────
  const limitHours = RATE_LIMITS[input.channel]
  const lastSentField = input.channel === 'sms' ? customer.last_sms_sent_at : customer.last_email_sent_at

  if (lastSentField) {
    const lastSent = new Date(lastSentField)
    const hoursSince = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60)
    if (hoursSince < limitHours) {
      const hoursLeft = Math.ceil(limitHours - hoursSince)
      return {
        allowed: false,
        reason:  `Rate limit: ${input.channel} was sent ${Math.floor(hoursSince)}h ago. Next send allowed in ${hoursLeft}h.`,
      }
    }
  }

  // ── 4. Quiet hours ───────────────────────────────────────────────────────────
  const tz = input.customerTz || 'America/New_York'
  const localHour = getLocalHour(tz)
  if (localHour < QUIET_HOUR_START || localHour >= QUIET_HOUR_END) {
    return {
      allowed: false,
      reason:  `Quiet hours: current local time ${localHour}:00 is outside 9am–9pm window`,
    }
  }

  return { allowed: true }
}

/** Call after a message is successfully sent — updates last_sent timestamps */
export async function recordMessageSent(
  customerId: string,
  channel:    Channel
) {
  const service = createServiceClient()
  const now = new Date().toISOString()

  if (channel === 'sms') {
    await service.from('customers').update({ last_sms_sent_at: now }).eq('id', customerId)
  } else {
    await service.from('customers').update({ last_email_sent_at: now }).eq('id', customerId)
  }
}

/**
 * Initiate SMS double opt-in for a customer.
 * Sends a confirmation text: "Reply YES to get exclusive deals from [Business]."
 * Stores a pending token in sms_opt_in_pending.
 */
export async function initiateSmsDoulbeOptIn({
  merchantId,
  customerId,
  phone,
  businessName,
}: {
  merchantId:   string
  customerId:   string
  phone:        string
  businessName: string
}): Promise<{ ok: boolean; error?: string }> {
  const service = createServiceClient()

  // Generate 6-char confirmation token
  const token = Math.random().toString(36).slice(2, 8).toUpperCase()

  // Store the pending opt-in
  await service.from('sms_opt_in_pending').insert({
    merchant_id:  merchantId,
    customer_id:  customerId,
    phone,
    token,
    expires_at:   new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  })

  // Mark customer as pending
  await service.from('customers')
    .update({ sms_opt_in_pending: true })
    .eq('id', customerId)

  // Send the opt-in request SMS
  const result = await sendSms({
    to:   phone,
    text: `${businessName}: Reply YES to get exclusive deals & offers. Std msg rates apply. Reply STOP to cancel.`,
  })

  return { ok: result.ok, error: result.error }
}

/**
 * Confirm SMS opt-in when the customer replies YES.
 * Called from the Telnyx inbound webhook.
 */
export async function confirmSmsOptIn(phone: string): Promise<{ ok: boolean; businessName?: string }> {
  const service = createServiceClient()

  // Find the most recent pending opt-in for this phone
  const { data: pending } = await service
    .from('sms_opt_in_pending')
    .select('id, merchant_id, customer_id, expires_at, merchants(business_name)')
    .eq('phone', phone)
    .is('confirmed_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('sent_at', { ascending: false })
    .limit(1)
    .single()

  if (!pending) return { ok: false }

  // Confirm the opt-in
  await service.from('sms_opt_in_pending')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', pending.id)

  if (pending.customer_id) {
    await service.from('customers')
      .update({ sms_double_opt_in: true, sms_opt_in_pending: false })
      .eq('id', pending.customer_id)
  }

  return {
    ok:           true,
    businessName: (pending as any).merchants?.business_name,
  }
}

/**
 * Process STOP keyword — opt the customer out of SMS.
 * Called from the Telnyx inbound webhook.
 */
export async function processSmsStop(phone: string): Promise<void> {
  const service = createServiceClient()
  await service.from('customers')
    .update({ sms_opt_out: true })
    .eq('phone', phone)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getLocalHour(tz: string): number {
  try {
    return parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour:     'numeric',
      hour12:   false,
    }).format(new Date()), 10)
  } catch {
    // Fallback to UTC if tz is invalid
    return new Date().getUTCHours()
  }
}
