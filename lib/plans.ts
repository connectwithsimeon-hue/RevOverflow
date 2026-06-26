/**
 * RevOverflow Plans — SINGLE SOURCE OF TRUTH
 *
 * Every price, credit allowance, and plan-gating decision in the app derives
 * from this file. The website, the Stripe checkout, the billing webhook, and
 * the backend credit engine all read from here so the numbers can never drift
 * apart again.
 *
 * Model (locked 2026-06):
 *   starter      — free / not subscribed yet
 *   business     — $97/mo,  500 credits   (full autonomous Yara + 3× guarantee)
 *   business_pro — $297/mo, 1,200 credits (+ 24/7 support, more POS/locations)
 *   custom       — contact sales (multi-location / franchise)
 *
 * Both paid tiers run the SAME autonomous Yara. Pro differs by support level
 * and how many POS connections / locations are allowed — not by capability.
 */

export type PlanId = 'starter' | 'business' | 'business_pro' | 'custom'

export interface PlanDef {
  id: PlanId
  name: string
  priceMonthly: number | null   // null = "contact us" (custom)
  credits: number               // monthly included credits
  maxPos: number                // POS connections allowed (Infinity for custom)
  maxLocations: number
  support: string
}

export const PLANS: Record<PlanId, PlanDef> = {
  starter: {
    id: 'starter', name: 'Free', priceMonthly: 0, credits: 0,
    maxPos: 1, maxLocations: 1, support: 'Community',
  },
  business: {
    id: 'business', name: 'Business', priceMonthly: 97, credits: 500,
    maxPos: 1, maxLocations: 1, support: 'Email, next business day',
  },
  business_pro: {
    id: 'business_pro', name: 'Business Pro', priceMonthly: 297, credits: 1200,
    maxPos: 3, maxLocations: 3, support: '24/7 priority',
  },
  custom: {
    id: 'custom', name: 'Custom', priceMonthly: null, credits: 0,
    maxPos: Infinity, maxLocations: Infinity, support: 'Dedicated manager',
  },
}

/**
 * Legacy plan ids that may still live in the merchants table from before the
 * pricing rework. We map each to its nearest current tier so existing accounts
 * keep working and gating stays correct until they re-subscribe.
 */
const LEGACY_ALIAS: Record<string, PlanId> = {
  capture: 'business',
  core:    'business',
  brain:   'business_pro',
  empire:  'business_pro',
  network: 'custom',
}

/** Normalize any stored plan string to a current PlanId. */
export function normalizePlan(plan?: string | null): PlanId {
  if (!plan) return 'starter'
  if (plan in PLANS) return plan as PlanId
  return LEGACY_ALIAS[plan] ?? 'starter'
}

/** True for any active paid subscription (business, pro, or custom). */
export function isPaidPlan(plan?: string | null): boolean {
  return normalizePlan(plan) !== 'starter'
}

/**
 * Both paid tiers get autonomous Yara, so autopilot access == paid.
 * Kept as a named helper so intent is clear at call sites.
 */
export const hasAutopilot = isPaidPlan

/** The 3× ROI guarantee applies to every paid tier. */
export const hasGuarantee = isPaidPlan

/** Pro-level perks: 24/7 support, more POS/locations. */
export function isProPlan(plan?: string | null): boolean {
  const p = normalizePlan(plan)
  return p === 'business_pro' || p === 'custom'
}

/** Monthly $ cost for guarantee/ROI math. */
export function planMonthlyCost(plan?: string | null): number {
  return PLANS[normalizePlan(plan)].priceMonthly ?? 0
}

/** Monthly included credits. */
export function planCredits(plan?: string | null): number {
  return PLANS[normalizePlan(plan)].credits
}

/** All plan ids (incl. legacy) that count as paid — for DB `.in()` filters. */
export const PAID_PLAN_IDS: string[] = [
  'business', 'business_pro', 'custom',
  'capture', 'core', 'brain', 'empire', 'network',
]

/**
 * Credit recharge packs — bought when a merchant runs out mid-month.
 * Base rate 10¢/credit, cheaper in bulk. Our cost is ~1.15¢/credit worst case,
 * so each pack is 5–10× margin.
 */
export interface CreditPack {
  id: string
  credits: number
  price: number    // USD
  tag: string      // marketing badge, '' for none
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack_200',  credits: 200,  price: 20,  tag: '' },
  { id: 'pack_500',  credits: 500,  price: 40,  tag: 'Save 20%' },
  { id: 'pack_1200', credits: 1200, price: 80,  tag: 'Save 33%' },
  { id: 'pack_1800', credits: 1800, price: 100, tag: 'Save 44%' },
]

/** Cents per credit for a pack, for display. */
export function centsPerCredit(pack: CreditPack): number {
  return Math.round((pack.price / pack.credits) * 100)
}
