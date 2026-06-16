/**
 * Google Ads Customer Match — suppression audience sync
 *
 * Model: RevOverflow operates ONE Google Ads Manager (MCC) account.
 * Each merchant grants that MCC account access from
 * Google Ads → Admin → Access and security → paste our manager email/ID,
 * then pastes their own Ads Customer ID into RevOverflow Settings.
 *
 * Customer Match is an async, multi-step process:
 *   1. Create a CRM-based user list (one-time, cached on merchants table)
 *   2. Create an OfflineUserDataJob of type CUSTOMER_MATCH_USER_LIST
 *   3. Add operations (hashed customer identifiers) to that job
 *   4. Run the job — Google processes it asynchronously on their side
 *
 * Env vars (global — Simeon pastes into .env.local/Vercel, never in chat):
 *   GOOGLE_ADS_DEVELOPER_TOKEN
 *   GOOGLE_ADS_CLIENT_ID
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GOOGLE_ADS_REFRESH_TOKEN      — refresh token for the MCC's OAuth app
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID  — our MCC customer ID, digits only
 */

import { createHash } from 'crypto'

const API_VERSION = 'v17'
const BASE = `https://googleads.googleapis.com/${API_VERSION}`

export interface GoogleSyncResult {
  ok: boolean
  userListResourceName?: string
  error?: string
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

/** Google wants phone in E.164 format before hashing */
function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  return digits.startsWith('+') ? digits : `+${digits}`
}

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) return null

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    return data?.access_token || null
  } catch {
    return null
  }
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '',
    'login-customer-id': (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/-/g, ''),
    'Content-Type': 'application/json',
  }
}

/** Step 1 — create the CRM-based suppression user list (call once, then cache resourceName) */
export async function createCustomerMatchUserList({
  customerId,
  name,
  description,
}: {
  customerId: string
  name: string
  description: string
}): Promise<GoogleSyncResult> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { ok: false, error: 'Google Ads credentials not configured' }
  const cid = customerId.replace(/-/g, '')

  try {
    const res = await fetch(`${BASE}/customers/${cid}/userLists:mutate`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        operations: [
          {
            create: {
              name,
              description,
              membershipLifeSpan: 10000,
              crmBasedUserList: { uploadKeyType: 'CONTACT_INFO', dataSourceType: 'FIRST_PARTY' },
            },
          },
        ],
      }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data?.error?.message || JSON.stringify(data?.error) || 'Google Ads API error' }
    return { ok: true, userListResourceName: data?.results?.[0]?.resourceName }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}

/** Steps 2–4 — create an offline user data job, add hashed identifiers, and run it */
export async function uploadCustomersToUserList({
  customerId,
  userListResourceName,
  customers,
}: {
  customerId: string
  userListResourceName: string
  customers: { email?: string; phone?: string }[]
}): Promise<GoogleSyncResult> {
  const accessToken = await getAccessToken()
  if (!accessToken) return { ok: false, error: 'Google Ads credentials not configured' }
  if (customers.length === 0) return { ok: true, userListResourceName }
  const cid = customerId.replace(/-/g, '')

  try {
    // Step 2: create the offline user data job
    const createJobRes = await fetch(`${BASE}/customers/${cid}/offlineUserDataJobs:create`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({
        job: {
          type: 'CUSTOMER_MATCH_USER_LIST',
          customerMatchUserListMetadata: { userList: userListResourceName },
        },
      }),
    })
    const jobData = await createJobRes.json()
    if (!createJobRes.ok) {
      return { ok: false, error: jobData?.error?.message || 'Failed to create offline user data job' }
    }
    const jobResourceName = jobData?.resourceName
    if (!jobResourceName) return { ok: false, error: 'No job resource name returned' }

    // Step 3: add operations — hashed identifiers
    const operations = customers
      .filter(c => c.email || c.phone)
      .map(c => ({
        create: {
          userIdentifiers: [
            ...(c.email ? [{ hashedEmail: sha256Hex(c.email) }] : []),
            ...(c.phone ? [{ hashedPhoneNumber: sha256Hex(normalizePhoneE164(c.phone)) }] : []),
          ],
        },
      }))

    const addOpsRes = await fetch(`${BASE}/${jobResourceName}:addOperations`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ operations, enablePartialFailure: true }),
    })
    if (!addOpsRes.ok) {
      const addOpsData = await addOpsRes.json()
      return { ok: false, error: addOpsData?.error?.message || 'Failed to add user data operations' }
    }

    // Step 4: run the job (Google processes asynchronously)
    const runRes = await fetch(`${BASE}/${jobResourceName}:run`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({}),
    })
    if (!runRes.ok) {
      const runData = await runRes.json()
      return { ok: false, error: runData?.error?.message || 'Failed to run offline user data job' }
    }

    return { ok: true, userListResourceName }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Network error' }
  }
}
