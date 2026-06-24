/**
 * Reputation — Google reviews monitoring
 *
 * Uses ONE RevOverflow Google Places API key (server-side). The merchant gives
 * us their Google Place ID; we periodically pull their overall rating + review
 * count + the most recent reviews. Comparing current vs previous lets Yara
 * detect a rating drop or a new (especially negative) review and act on it.
 *
 * Env: GOOGLE_PLACES_API_KEY
 */

import { createServiceClient } from '@/lib/supabase/server'

const PLACES_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json'
const STALE_MS = 12 * 60 * 60 * 1000 // refresh at most every 12h

export interface PlaceReview {
  author: string
  rating: number
  text: string
  time: number // unix seconds
  relative: string
}

export interface PlaceData {
  name: string | null
  rating: number | null
  reviewCount: number | null
  reviews: PlaceReview[]
}

export function isReputationConfigured(): boolean {
  return !!process.env.GOOGLE_PLACES_API_KEY
}

/** Server-side fetch of a place's rating + reviews. Returns null on failure. */
export async function fetchGooglePlace(placeId: string): Promise<PlaceData | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key || !placeId) return null

  const url = `${PLACES_DETAILS_URL}?place_id=${encodeURIComponent(placeId)}&fields=name,rating,user_ratings_total,reviews&key=${key}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    if (data.status !== 'OK' || !data.result) return null
    const r = data.result
    const reviews: PlaceReview[] = (r.reviews ?? []).map((rv: Record<string, unknown>) => ({
      author: String(rv.author_name ?? 'Anonymous'),
      rating: Number(rv.rating ?? 0),
      text: String(rv.text ?? ''),
      time: Number(rv.time ?? 0),
      relative: String(rv.relative_time_description ?? ''),
    }))
    return {
      name: r.name ?? null,
      rating: typeof r.rating === 'number' ? r.rating : null,
      reviewCount: typeof r.user_ratings_total === 'number' ? r.user_ratings_total : null,
      reviews,
    }
  } catch {
    return null
  }
}

export interface ReputationRow {
  google_place_id: string | null
  business_name: string | null
  rating: number | null
  review_count: number | null
  prev_rating: number | null
  prev_review_count: number | null
  recent_reviews: PlaceReview[] | null
  last_checked_at: string | null
}

/** Load the stored reputation row for a merchant (no fetch). */
export async function getReputation(merchantId: string): Promise<ReputationRow | null> {
  const service = createServiceClient()
  const { data } = await service.from('reputation').select('*').eq('merchant_id', merchantId).maybeSingle()
  return (data as ReputationRow) ?? null
}

/**
 * Refresh from Google if we have a place id, the key is set, and the data is
 * stale (or forced). Rolls current → previous so changes can be detected.
 * Returns the up-to-date row.
 */
export async function refreshReputation(merchantId: string, force = false): Promise<ReputationRow | null> {
  const service = createServiceClient()
  const row = await getReputation(merchantId)
  if (!row?.google_place_id || !isReputationConfigured()) return row

  const fresh = row.last_checked_at ? Date.now() - new Date(row.last_checked_at).getTime() : Infinity
  if (!force && fresh < STALE_MS) return row

  const place = await fetchGooglePlace(row.google_place_id)
  if (!place) return row

  const update = {
    rating: place.rating,
    review_count: place.reviewCount,
    prev_rating: row.rating,
    prev_review_count: row.review_count,
    recent_reviews: place.reviews,
    business_name: row.business_name ?? place.name,
    last_checked_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  await service.from('reputation').update(update).eq('merchant_id', merchantId)
  return { ...row, ...update }
}
