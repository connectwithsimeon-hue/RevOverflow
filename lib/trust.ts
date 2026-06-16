/**
 * Trust Score System — Stage 4
 *
 * Yara earns trust by delivering results. The trust score gates how
 * autonomously she operates — starting conservative and unlocking
 * progressively as she proves ROI.
 *
 * Trust levels:
 *   0 – Supervised  : max 5 sends/day, requires merchant to manually approve campaigns
 *   1 – Learning    : max 20 sends/day, auto-sends but notifies merchant
 *   2 – Trusted     : max 100 sends/day, full auto, weekly digest
 *   3 – Autonomous  : unlimited (capped by credits), monthly digest only
 *
 * Score factors (0–100):
 *   - Days active                              up to 25 pts (25 pts at 90 days)
 *   - Revenue attributed via outcome_log       up to 30 pts (30 pts at 10× plan cost)
 *   - Campaigns sent without complaints        up to 20 pts
 *   - Opt-out rate (penalises high unsubscribes) up to 15 pts
 *   - Merchant manually approved ≥1 campaign   5 pts bonus
 */

import { createServiceClient } from '@/lib/supabase/server'

export interface TrustScore {
  score: number           // 0–100
  level: 0 | 1 | 2 | 3
  levelName: string
  maxSendsPerDay: number
  requiresApproval: boolean  // true at level 0
  factors: {
    daysActive: number
    revenueScore: number
    campaignScore: number
    optOutScore: number
    approvalBonus: number
  }
  computedAt: string
}

const LEVEL_THRESHOLDS = [0, 25, 55, 80] as const

function scoreToLevel(score: number): 0 | 1 | 2 | 3 {
  if (score >= LEVEL_THRESHOLDS[3]) return 3
  if (score >= LEVEL_THRESHOLDS[2]) return 2
  if (score >= LEVEL_THRESHOLDS[1]) return 1
  return 0
}

const LEVEL_META: Record<0 | 1 | 2 | 3, { name: string; maxSends: number; requiresApproval: boolean }> = {
  0: { name: 'Supervised',  maxSends: 5,          requiresApproval: true  },
  1: { name: 'Learning',    maxSends: 20,          requiresApproval: false },
  2: { name: 'Trusted',     maxSends: 100,         requiresApproval: false },
  3: { name: 'Autonomous',  maxSends: 9999,        requiresApproval: false },
}

export async function computeTrustScore(merchantId: string): Promise<TrustScore> {
  const service = createServiceClient()

  // ── Load merchant data ──────────────────────────────────────────────────
  const { data: merchant } = await service
    .from('merchants')
    .select('id, plan, created_at, subscription_started_at')
    .eq('id', merchantId)
    .single()

  const startedAt  = merchant?.subscription_started_at ?? merchant?.created_at ?? new Date().toISOString()
  const daysActive = Math.floor((Date.now() - new Date(startedAt).getTime()) / (1000 * 60 * 60 * 24))

  // ── Factor 1: Days active (max 25 pts at 90 days) ──────────────────────
  const daysActive_score = Math.min(25, Math.round((daysActive / 90) * 25))

  // ── Factor 2: Revenue attributed (max 30 pts at 10× plan cost) ─────────
  const { data: revRows } = await service
    .from('outcome_log')
    .select('metadata')
    .eq('merchant_id', merchantId)
    .eq('action_type', 'revenue_attributed')

  const totalRevenue = (revRows ?? []).reduce((sum, row) => {
    const amt = (row.metadata as Record<string, number> | null)?.order_amount ?? 0
    return sum + amt
  }, 0)

  // Plan cost per month
  const PLAN_COSTS: Record<string, number> = {
    capture: 97, core: 297, brain: 597, empire: 1197, network: 2997,
  }
  const planCost = PLAN_COSTS[merchant?.plan ?? 'core'] ?? 297
  const revenueRatio   = Math.min(1, totalRevenue / (planCost * 10))
  const revenueScore   = Math.round(revenueRatio * 30)

  // ── Factor 3: Campaigns sent without complaints (max 20 pts) ───────────
  const { count: totalSent } = await service
    .from('outcome_log')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('action_type', 'campaign_sent')

  // Simple heuristic: more sends = more proven. Cap at 500 sends → full 20 pts
  const campaignScore = Math.min(20, Math.round(((totalSent ?? 0) / 500) * 20))

  // ── Factor 4: Opt-out rate penalty (max 15 pts) ─────────────────────────
  const { count: optOuts } = await service
    .from('outcome_log')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('action_type', 'sms_opt_out')

  const optOutRate = totalSent && totalSent > 0 ? (optOuts ?? 0) / totalSent : 0
  // Full 15 pts if opt-out rate < 1%; 0 pts if > 5%
  const optOutScore = optOutRate >= 0.05
    ? 0
    : Math.round((1 - optOutRate / 0.05) * 15)

  // ── Factor 5: Merchant has manually approved a campaign (5 pts) ─────────
  const { count: approved } = await service
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchantId)
    .eq('status', 'sent')
    .eq('auto_sent', false)   // manually triggered

  const approvalBonus = (approved ?? 0) > 0 ? 5 : 0

  const score = daysActive_score + revenueScore + campaignScore + optOutScore + approvalBonus
  const level = scoreToLevel(score)
  const meta  = LEVEL_META[level]

  return {
    score,
    level,
    levelName:        meta.name,
    maxSendsPerDay:   meta.maxSends,
    requiresApproval: meta.requiresApproval,
    factors: {
      daysActive:    daysActive_score,
      revenueScore,
      campaignScore,
      optOutScore,
      approvalBonus,
    },
    computedAt: new Date().toISOString(),
  }
}

/**
 * Guardrail check — call this before any autonomous send.
 * Returns { allowed, reason } so callers can log/skip cleanly.
 */
export async function checkGuardrails(
  merchantId: string,
  sendsToday: number
): Promise<{ allowed: boolean; reason?: string }> {
  const trust = await computeTrustScore(merchantId)

  if (trust.requiresApproval) {
    return { allowed: false, reason: `trust_level_0: merchant must approve campaigns manually (score ${trust.score}/100)` }
  }

  if (sendsToday >= trust.maxSendsPerDay) {
    return { allowed: false, reason: `daily_send_cap: ${sendsToday}/${trust.maxSendsPerDay} sends used (trust level ${trust.level})` }
  }

  return { allowed: true }
}
