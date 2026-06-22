/**
 * Cross-POS customer identity resolution.
 *
 * A merchant can connect more than one POS at once (Square, Clover, Toast —
 * up to all 3, since that's every adapter RevOverflow has today). Each POS
 * has its own customer ID scheme, so without this, the same real person
 * could end up as TWO separate `customers` rows — one created from Square's
 * sync, another from Clover's — which would silently fragment their order
 * history, RFV score, and segment. That breaks the "one unified customer
 * base" promise.
 *
 * Strategy, in order:
 *   1. Match on this POS's own id column (handles re-syncs / repeat events).
 *   2. Fall back to matching an existing customer row for this merchant by
 *      phone or email — if found, attach this POS's id to that SAME row
 *      instead of inserting a duplicate.
 *   3. Otherwise, insert a brand-new customer row.
 *
 * Email/phone lookups are done as two separate equality queries (not a
 * single `.or()` filter string) to avoid building a PostgREST filter string
 * out of raw external input.
 */

import type { createServiceClient } from '@/lib/supabase/server'

type ServiceClient = ReturnType<typeof createServiceClient>

export type PosSource = 'square' | 'clover' | 'toast'

const POS_ID_COLUMN: Record<PosSource, 'square_customer_id' | 'clover_customer_id' | 'toast_customer_id'> = {
  square: 'square_customer_id',
  clover: 'clover_customer_id',
  toast: 'toast_customer_id',
}

export interface PosCustomerInput {
  posCustomerId: string
  name?: string | null
  email?: string | null
  phone?: string | null
  birthday?: string | null
  createdAt?: string | null
}

/**
 * Finds or creates the single customer row for this merchant that
 * corresponds to a given POS customer, merging across POS sources by
 * phone/email so one real person = one row.
 *
 * Returns the customers.id (uuid), or null if something went wrong.
 */
export async function upsertPosCustomer(
  service: ServiceClient,
  merchantId: string,
  source: PosSource,
  input: PosCustomerInput
): Promise<string | null> {
  const idColumn = POS_ID_COLUMN[source]
  const email = input.email?.trim() || null
  const phone = input.phone?.trim() || null

  // 1) Exact match on this POS's own id — already-linked row, just refresh it.
  const { data: exact } = await service
    .from('customers')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq(idColumn, input.posCustomerId)
    .maybeSingle()

  if (exact?.id) {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (input.name) updates.name = input.name
    if (email) updates.email = email
    if (phone) updates.phone = phone
    if (input.birthday) updates.birthday = input.birthday
    await service.from('customers').update(updates).eq('id', exact.id)
    return exact.id
  }

  // 2) Cross-POS match — same real person seen through a different POS.
  const matchId = await findExistingCustomerByContact(service, merchantId, email, phone)
  if (matchId) {
    const updates: Record<string, unknown> = {
      [idColumn]: input.posCustomerId,
      updated_at: new Date().toISOString(),
    }
    if (input.name) updates.name = input.name
    await service.from('customers').update(updates).eq('id', matchId)
    return matchId
  }

  // 3) No match anywhere — genuinely new customer.
  const { data: created, error } = await service
    .from('customers')
    .insert({
      merchant_id: merchantId,
      [idColumn]: input.posCustomerId,
      name: input.name ?? null,
      email,
      phone,
      birthday: input.birthday ?? null,
      created_at: input.createdAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error(`upsertPosCustomer: insert failed (${source})`, error)
    return null
  }
  return created?.id ?? null
}

async function findExistingCustomerByContact(
  service: ServiceClient,
  merchantId: string,
  email: string | null,
  phone: string | null
): Promise<string | null> {
  if (email) {
    const { data } = await service
      .from('customers')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('email', email)
      .limit(1)
    if (data?.[0]?.id) return data[0].id
  }
  if (phone) {
    const { data } = await service
      .from('customers')
      .select('id')
      .eq('merchant_id', merchantId)
      .eq('phone', phone)
      .limit(1)
    if (data?.[0]?.id) return data[0].id
  }
  return null
}
