/**
 * Facebook / Meta Custom Audience sync — via the Meta Marketing API
 *
 * Model: RevOverflow operates ONE Meta Business Manager System User token
 * (META_ACCESS_TOKEN). Each merchant grants that Business Manager
 * "Ads — Manage" partner access to their own Ad Account from
 * Meta Business Settings → Partners → Add → paste our Business ID.
 * Once that one-time grant is made, the merchant just pastes their
 * own Ad Account ID (digits only, no "act_" prefix) into RevOverflow
 * Settings, and our system user token can create/update audiences
 * inside their ad account on their behalf.
 *
 * Two audiences are kept in sync per merchant:
 *   1. Suppression audience — ALL known customers, hashed, so the
 *      merchant can exclude existing customers from "new customer"
 *      acquisition campaigns.
 *   2. Lookalike audience — built from the suppression audience as the
 *      seed, 1% lookalike in the merchant's country, for prospecting.
 *
 * Env vars (global — Simeon pastes into .env.local/Vercel, never in chat):
 *   META_ACCESS_TOKEN   — Business Manager System User token, ads_management scope
 *   META_API_VERSION    — optional, defaults to v19.0
 */

import { createHash } from 'crypto'

const META_API_VERSION = process.env.META_API_VERSION || 'v19.0'
const GRAPH = `https://graph.facebook.com/${META_API_VERSION}`

export interface MetaAudienceResult {
  ok: boolean
  audienceId?: string
  error?: string
}

/** Meta requires SHA-256 of normalized (trimmed, lowercased) PII */
function sha256Hex(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/** Meta wants phone digits only, with country code, no "+" */
function normalizePhoneForHash(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

export async function createSuppressionAudience({
  adAccountId,
  name,
  description,
}: {
  adAccountId: string
  name: string
  description: string
}): Promise<MetaAudienceResult> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return { ok: false, error: 'META_ACCESS_TOKEN not set' }

  try {
    const res = await fetch(`${GRAPH}/act_${adAccountId}/customaudiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        subtype: 'CUSTOM',
        customer_file_source: 'USER_PROVIDED_ONLY',
        access_token: token,
      }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data?.error?.message || 'Meta API error' }
    return { ok: true, audienceId: data.id }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

export async function addCustomersToAudience({
  audienceId,
  customers,
}: {
  audienceId: string
  customers: { email?: string; phone?: string }[]
}): Promise<MetaAudienceResult> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return { ok: false, error: 'META_ACCESS_TOKEN not set' }
  if (customers.length === 0) return { ok: true, audienceId }

  // Multi-key schema: EMAIL + PHONE columns, hashed; empty string if missing
  const schema = ['EMAIL', 'PHONE']
  const data = customers.map(c => [
    c.email ? sha256Hex(c.email) : '',
    c.phone ? sha256Hex(normalizePhoneForHash(c.phone)) : '',
  ])

  try {
    const res = await fetch(`${GRAPH}/${audienceId}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: { schema, data },
        access_token: token,
      }),
    })
    const result = await res.json()
    if (!res.ok) return { ok: false, error: result?.error?.message || 'Meta API error' }
    return { ok: true, audienceId }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

export async function createLookalikeAudience({
  adAccountId,
  originAudienceId,
  name,
  countryCode = 'US',
  ratio = 0.01,
}: {
  adAccountId: string
  originAudienceId: string
  name: string
  countryCode?: string
  ratio?: number
}): Promise<MetaAudienceResult> {
  const token = process.env.META_ACCESS_TOKEN
  if (!token) return { ok: false, error: 'META_ACCESS_TOKEN not set' }

  try {
    const res = await fetch(`${GRAPH}/act_${adAccountId}/customaudiences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        subtype: 'LOOKALIKE',
        origin_audience_id: originAudienceId,
        lookalike_spec: JSON.stringify({ type: 'similarity', country: countryCode, ratio }),
        access_token: token,
      }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data?.error?.message || 'Meta API error' }
    return { ok: true, audienceId: data.id }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}
