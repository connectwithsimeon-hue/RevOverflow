/**
 * Reputation Agent
 *
 * Goal: protect and grow local reputation, which drives new walk-in revenue.
 * Two halves:
 *   1. Review requests — ask happy customers (high RFV, recent, reachable) for a
 *      review. Works today on Square data.
 *   2. Monitoring — once the merchant connects their Google listing, Yara tracks
 *      the rating + reviews, flags drops and new negative reviews, and prompts
 *      recovery. Uses one RevOverflow Google Places key (lib/reputation.ts).
 */

import type { AgentContext, AgentResult, AgentRecommendation } from './types'
import { daysSince } from './types'

export function reputationAgent(ctx: AgentContext): AgentResult {
  const base = {
    id: 'reputation',
    name: 'Reputation Agent',
    icon: '⭐',
    tagline: 'Protects your rating and turns happy customers into 5-star reviews.',
  }

  if (!ctx.isConnected || ctx.customers.length === 0) {
    return {
      ...base,
      status: 'no_data' as const,
      statusLabel: 'Connect POS',
      headline: 'Connect your POS to find your happiest customers.',
      recommendations: [],
      dataNeeded: 'Connect Square, Clover, or Toast and sync your customers.',
    }
  }

  const recs: AgentRecommendation[] = []
  const rep = ctx.reputation

  // ── Monitoring half (if a Google listing is connected) ────────────────────
  let monitorHeadline: string | null = null
  if (rep?.connected && rep.rating != null) {
    const dropped = rep.prevRating != null && rep.rating < rep.prevRating
    const newReviews = rep.reviewCount != null && rep.prevReviewCount != null ? rep.reviewCount - rep.prevReviewCount : 0

    if (dropped) {
      recs.push({
        title: `Your rating slipped to ${rep.rating.toFixed(1)} — recover it`,
        detail: `Your Google rating dropped from ${rep.prevRating!.toFixed(1)} to ${rep.rating.toFixed(1)}. Yara can launch a review-request push to your happiest recent customers to pull it back up fast.`,
        cta: { label: 'Launch recovery push', href: '/campaigns' },
      })
    }
    if (rep.recentNegativeCount > 0) {
      recs.push({
        title: `${rep.recentNegativeCount} recent negative review${rep.recentNegativeCount > 1 ? 's' : ''} to respond to`,
        detail: `Yara flagged ${rep.recentNegativeCount} review${rep.recentNegativeCount > 1 ? 's' : ''} at 3 stars or below. Responding quickly — and out-weighing them with fresh 5-star reviews — protects your walk-in traffic.`,
        cta: { label: 'Review on the Reputation page', href: '/dashboard/reputation' },
      })
    }
    monitorHeadline = dropped
      ? `Rating dropped to ${rep.rating.toFixed(1)} — Yara is on it.`
      : `Your Google rating is ${rep.rating.toFixed(1)} from ${rep.reviewCount ?? 0} reviews${newReviews > 0 ? ` (+${newReviews} new)` : ''}.`
  }

  // ── Review-request half (always available on Square data) ─────────────────
  const happy = ctx.customers.filter(
    (c) =>
      (c.rfv_score ?? 0) >= 70 &&
      daysSince(c.last_purchase_at) <= 30 &&
      c.is_reachable &&
      (c.sms_opt_in || c.email_opt_in),
  )
  if (happy.length > 0) {
    recs.push({
      title: `Ask ${happy.length} happy customers for a review`,
      detail: `${happy.length} customers bought in the last 30 days, scored highly, and can be reached. A review-request message lifts your rating — the single biggest driver of new walk-in traffic.`,
      cta: { label: 'Create review campaign', href: '/campaigns' },
    })
  }

  // Headline + status
  const headline =
    monitorHeadline ??
    (happy.length > 0
      ? `${happy.length} happy customers are ready to be asked for a review.`
      : 'No recent happy customers to ask just yet — Yara is watching.')

  return {
    ...base,
    status: 'active',
    statusLabel: rep?.connected ? 'Active' : happy.length > 0 ? 'Active' : 'Watching',
    headline,
    recommendations: recs,
    dataNeeded: rep?.connected
      ? undefined
      : 'Connect your Google listing on the Reputation page to also monitor your rating and recover unhappy customers.',
  }
}
