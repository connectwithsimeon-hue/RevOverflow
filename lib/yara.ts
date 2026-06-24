/**
 * Yara — RevOverflow's AI Revenue Operator
 *
 * Yara uses Claude (claude-haiku-4-5) to write every message personally,
 * using the customer's real purchase history, segment, and the merchant's
 * business name and voice.
 *
 * Env var required:
 *   ANTHROPIC_API_KEY — from console.anthropic.com
 */

import Anthropic from '@anthropic-ai/sdk'
import type { ContextSnapshot } from '@/lib/context-engine'
import { formatContextForPrompt } from '@/lib/context-engine'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export type TriggerType =
  | 'win_back'        // At-risk or lapsed — bring them back
  | 'new_customer'    // First visit → drive second visit
  | 'vip_reward'      // Loyal high-LTV customer — make them feel special
  | 'birthday'        // Birthday offer
  | 'cross_sell'      // Based on purchase history, suggest something new

export interface CustomerContext {
  firstName: string
  totalOrders: number
  lifetimeValue: number          // in dollars
  avgOrderValue: number          // in dollars
  daysSinceLastVisit: number
  favoriteItems?: string[]       // top catalog items purchased
  segment: string                // at_risk | lapsed | new | loyal | active
  birthday?: string              // MM-DD format if known
}

export interface MerchantContext {
  businessName: string
  industry?: string              // e.g. "coffee shop", "barbershop", "salon"
  customVoice?: string           // optional tone notes from merchant settings
}

export interface YaraMessageResult {
  smsText: string                // ≤160 chars, includes STOP opt-out
  emailSubject: string
  emailBodyHtml: string
  offerSuggestion?: string       // e.g. "15% off next visit"
}

// ── System prompt — Yara's identity ──────────────────────────────────────────
const YARA_SYSTEM = `You are Yara, the AI Revenue Operator for RevOverflow. You write short, warm, personal win-back messages on behalf of small businesses to bring their lapsed customers back.

Your rules:
- Write like a real human who knows the customer — never robotic, never salesy
- Use the customer's first name naturally (once, at the start)
- Reference their actual history when you have it (visits, value, time away)
- Keep SMS copy under 95 characters. A short redemption line and the opt-out are appended automatically — do NOT write them yourself.
- Email subject lines are punchy and personal — under 50 characters
- Email body is warm, brief, 2-3 short paragraphs, no walls of text
- Never make up facts about the customer you weren't given
- Match the business's tone — a barbershop is casual; a fine dining restaurant is warmer and more elevated
- The offer should feel like a genuine thank-you, not a desperate discount
- Always return valid JSON — nothing else`

// ── Main copy generator ───────────────────────────────────────────────────────
export async function generateYaraCopy(
  trigger: TriggerType,
  customer: CustomerContext,
  merchant: MerchantContext,
  offerHint?: string,           // e.g. "10% off" if merchant has set a discount
  context?: ContextSnapshot     // optional real-world context from context engine
): Promise<YaraMessageResult> {

  const contextBlock = buildContextBlock(trigger, customer, merchant, offerHint, context)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: YARA_SYSTEM,
    messages: [
      {
        role: 'user',
        content: contextBlock,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    // Extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0])

    // Build the SMS: warm copy + a fixed redemption + opt-out line. The
    // redemption line ("give your number at checkout") is what attaches the
    // customer to the sale in the POS, which is how the revenue gets attributed
    // back to this exact person — even for an anonymous walk-in.
    const REDEEM = 'Give your number at checkout to redeem.'
    const STOP = 'Reply STOP to opt out.'
    let copy = (parsed.smsText || '')
      .trim()
      .replace(/\s*reply stop[\s\S]*$/i, '')   // strip any opt-out the model added
      .replace(REDEEM, '')                      // strip any redemption it echoed
      .trim()
    const suffix = ` ${REDEEM} ${STOP}`
    const maxCopy = 160 - suffix.length
    if (copy.length > maxCopy) copy = copy.slice(0, maxCopy - 1).trim()
    const smsText = `${copy} ${REDEEM} ${STOP}`

    // Email carries the same redemption instruction as a small note.
    const baseEmail = parsed.emailBodyHtml || buildFallbackEmailHtml(customer, merchant)
    const emailBodyHtml = `${baseEmail}<p style="font-size:13px;color:#6b7280;margin-top:18px;">To redeem: show this message and give the phone number you received it on at checkout.</p>`

    return {
      smsText,
      emailSubject: parsed.emailSubject || `We miss you at ${merchant.businessName}`,
      emailBodyHtml,
      offerSuggestion: parsed.offerSuggestion,
    }
  } catch {
    // Fallback to safe defaults if AI response is malformed
    return buildFallbackCopy(trigger, customer, merchant)
  }
}

// ── Context builder — tells Yara everything about this customer ───────────────
function buildContextBlock(
  trigger: TriggerType,
  customer: CustomerContext,
  merchant: MerchantContext,
  offerHint?: string,
  context?: ContextSnapshot
): string {
  const triggerDescriptions: Record<TriggerType, string> = {
    win_back: `This customer is ${customer.segment} — they used to visit regularly but have drifted away. Bring them back warmly.`,
    new_customer: `This customer visited for the first time recently. Turn them into a regular. The goal is their second visit.`,
    vip_reward: `This is a top customer — loyal, high-value, visits often. Make them feel genuinely appreciated. This is a reward, not a discount.`,
    birthday: `It's around this customer's birthday. Send a personal birthday message with a special offer.`,
    cross_sell: `This customer loves ${customer.favoriteItems?.join(', ') || 'your products'}. Suggest something complementary they haven't tried.`,
  }

  return `Write a personal message for this customer on behalf of ${merchant.businessName}${merchant.industry ? ` (${merchant.industry})` : ''}.

TRIGGER: ${triggerDescriptions[trigger]}

CUSTOMER FACTS:
- Name: ${customer.firstName}
- Total visits: ${customer.totalOrders}
- Lifetime spent: $${customer.lifetimeValue.toFixed(0)}
- Average order: $${customer.avgOrderValue.toFixed(0)}
- Days since last visit: ${customer.daysSinceLastVisit}
${customer.favoriteItems?.length ? `- Known favorites: ${customer.favoriteItems.slice(0, 3).join(', ')}` : ''}
${customer.birthday ? `- Birthday: ${customer.birthday}` : ''}

MERCHANT VOICE: ${merchant.customVoice || 'warm and friendly, like a neighborhood business that genuinely cares'}

${context ? `REAL-WORLD CONTEXT (use this to make your message feel timely — reference it naturally if relevant):
${formatContextForPrompt(context)}
` : ''}${offerHint ? `OFFER TO INCLUDE: ${offerHint}` : 'Include a light offer or incentive — suggest what feels right'}

Return ONLY this JSON (no other text):
{
  "smsText": "...",
  "emailSubject": "...",
  "emailBodyHtml": "...",
  "offerSuggestion": "..."
}`
}

// ── Fallbacks if Claude API fails or isn't configured ────────────────────────
function buildFallbackCopy(
  trigger: TriggerType,
  customer: CustomerContext,
  merchant: MerchantContext
): YaraMessageResult {
  const name = customer.firstName || 'there'
  const biz = merchant.businessName

  const smsTemplates: Record<TriggerType, string> = {
    win_back: `Hey ${name}! We miss you at ${biz} — come back, we'll make it worth your while.`,
    new_customer: `Hey ${name}, thanks for visiting ${biz}! We'd love to see you again soon.`,
    vip_reward: `Hey ${name}, you're one of our best at ${biz} — a little thank-you is waiting.`,
    birthday: `Happy birthday ${name}! 🎉 ${biz} has a special gift for you.`,
    cross_sell: `Hey ${name}! Next time at ${biz}, ask about something new you might love.`,
  }

  const REDEEM = 'Give your number at checkout to redeem.'
  const STOP = 'Reply STOP to opt out.'
  let copy = smsTemplates[trigger]
  const suffix = ` ${REDEEM} ${STOP}`
  const maxCopy = 160 - suffix.length
  if (copy.length > maxCopy) copy = copy.slice(0, maxCopy - 1).trim()
  const smsText = `${copy} ${REDEEM} ${STOP}`

  return {
    smsText,
    emailSubject: `${name}, we miss you at ${biz}`,
    emailBodyHtml: `${buildFallbackEmailHtml(customer, merchant)}<p style="font-size:13px;color:#6b7280;margin-top:18px;">To redeem: show this message and give the phone number you received it on at checkout.</p>`,
    offerSuggestion: '10% off next visit',
  }
}

function buildFallbackEmailHtml(customer: CustomerContext, merchant: MerchantContext): string {
  const name = customer.firstName || 'there'
  return `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem; color: #1a1a1a;">
  <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem;">Hey ${name}, we miss you! 👋</h2>
  <p style="color: #555; line-height: 1.7; margin-bottom: 1.5rem;">
    It's been a while since we've seen you at ${merchant.businessName}, and we wanted to reach out personally.
  </p>
  <p style="color: #555; line-height: 1.7; margin-bottom: 1.5rem;">
    Your next visit means a lot to us. Come back and we'll make sure it's worth your while.
  </p>
  <p style="color: #888; font-size: 0.875rem; margin-top: 2rem; border-top: 1px solid #eee; padding-top: 1rem;">
    You're receiving this because you've visited ${merchant.businessName} before.
    To stop receiving messages, reply STOP to any SMS or <a href="#unsubscribe">unsubscribe here</a>.
  </p>
</div>`
}

// ── Batch copy for multiple customers (used by auto-campaign cron) ───────────
export async function generateBatchCopy(
  trigger: TriggerType,
  customers: CustomerContext[],
  merchant: MerchantContext,
  offerHint?: string,
  context?: ContextSnapshot
): Promise<Map<string, YaraMessageResult>> {
  const results = new Map<string, YaraMessageResult>()

  // Generate copy for each customer individually — Yara personalizes each one
  // Run in batches of 5 to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize)
    await Promise.all(
      batch.map(async (c) => {
        const copy = await generateYaraCopy(trigger, c, merchant, offerHint, context)
        results.set(c.firstName + '_' + i, copy)
      })
    )
    // Brief pause between batches
    if (i + batchSize < customers.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return results
}
