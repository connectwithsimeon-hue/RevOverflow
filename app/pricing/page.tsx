'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PLANS as PLAN_DEFS, CREDIT_PACKS, centsPerCredit } from '@/lib/plans'

const PLANS = [
  {
    id: 'business',
    name: PLAN_DEFS.business.name,
    price: PLAN_DEFS.business.priceMonthly!,
    credits: PLAN_DEFS.business.credits,
    description: 'Pays for itself when Yara brings back ~3 customers',
    features: [
      'Autonomous Yara — finds & wins back customers for you',
      'All 12 revenue agents working 24/7',
      'SMS + email campaigns, written & sent automatically',
      'Control-group revenue attribution',
      `${PLAN_DEFS.business.credits} credits / month (~${PLAN_DEFS.business.credits} messages)`,
      '3× ROI guarantee in 60 days',
      '1 POS connection · email support',
    ],
    highlight: true,
  },
  {
    id: 'business_pro',
    name: PLAN_DEFS.business_pro.name,
    price: PLAN_DEFS.business_pro.priceMonthly!,
    credits: PLAN_DEFS.business_pro.credits,
    description: 'Pays for itself when Yara brings back ~10 customers',
    features: [
      'Everything in Business',
      `${PLAN_DEFS.business_pro.credits.toLocaleString()} credits / month`,
      'Up to 3 POS connections & locations',
      '24/7 priority support',
      '3× ROI guarantee in 60 days',
    ],
    highlight: false,
  },
]

// CREDIT_PACKS come from lib/plans.ts (single source of truth).

const CREDIT_ACTIONS = [
  { action: 'Yara sends a text or email',      cost: 1  },
  { action: 'Yara builds & runs a campaign',   cost: 10 },
  { action: 'Yara handles an inbound reply',   cost: 2  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError]     = useState('')

  async function handleSubscribe(planId: string) {
    setLoading(planId)
    setError('')
    try {
      const res  = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (!data.url) throw new Error(data.error || 'Could not create checkout session')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setLoading(null)
    }
  }

  async function handleBuyCredits(packId: string) {
    setLoading(packId)
    setError('')
    try {
      const res  = await fetch('/api/billing/credits-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: packId }),
      })
      const data = await res.json()
      if (!data.url) throw new Error(data.error || 'Could not create checkout session')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message)
      setLoading(null)
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: '1.125rem' }}>
            Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
          </span>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </nav>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '4rem 1.5rem' }}>

        {/* Header */}
        <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '2.25rem', fontWeight: 800, textAlign: 'center', marginBottom: '0.75rem' }}>
          Simple, transparent pricing
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', textAlign: 'center', maxWidth: '480px', margin: '0 auto 3rem' }}>
          Yara pays for herself. Most merchants see 3–10× ROI in the first 60 days.
        </p>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '2rem', color: '#b91c1c', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{
              backgroundColor: plan.highlight ? 'rgba(124,92,252,0.08)' : 'var(--surface)',
              border: plan.highlight ? '2px solid var(--violet)' : '1px solid var(--border)',
              borderRadius: '20px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}>
              {plan.highlight && (
                <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--violet)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.2rem' }}>{plan.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>{plan.description}</div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '2.5rem', fontWeight: 800 }}>${plan.price}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>/month</span>
              </div>

              {/* Credits pill */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: 'rgba(124,92,252,0.12)', color: 'var(--violet)', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', marginBottom: '1.25rem', width: 'fit-content' }}>
                <span>✦</span> {plan.credits.toLocaleString()} Yara credits / mo
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '0.6rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#15803d', flexShrink: 0, marginTop: '1px' }}>✓</span>{f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: '100%',
                  backgroundColor: plan.highlight ? 'var(--violet)' : 'transparent',
                  color: plan.highlight ? '#fff' : 'var(--text-primary)',
                  border: plan.highlight ? 'none' : '1px solid var(--border)',
                  borderRadius: '10px',
                  fontWeight: 700,
                  padding: '0.75rem',
                  fontSize: '0.9375rem',
                  cursor: loading === plan.id ? 'not-allowed' : 'pointer',
                  opacity: loading === plan.id ? 0.6 : 1,
                  fontFamily: 'inherit',
                  transition: 'opacity 0.15s',
                }}
              >
                {loading === plan.id ? 'Redirecting…' : 'Get started'}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '1.25rem' }}>
          14-day free trial on every plan. Cancel anytime. Plan credits reset each month; purchased credits never expire.
        </p>

        {/* Custom / enterprise */}
        <div style={{
          marginTop: '1.5rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '1.5rem 1.75rem', display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        }}>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: '1.0625rem' }}>Custom</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: 520 }}>
              Multi-location, franchise, or unusual volume? Unlimited POS &amp; locations, a custom credit pool, and a dedicated success manager.
            </div>
          </div>
          <a href="mailto:sales@revoverflow.com?subject=RevOverflow%20Custom%20plan" style={{
            backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)',
            borderRadius: '10px', fontWeight: 700, padding: '0.75rem 1.5rem', fontSize: '0.9375rem',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Contact sales →
          </a>
        </div>

        {/* ── Credits section ── */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '3.5rem 0' }} />

        <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Yara Credits
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '2rem', maxWidth: '560px' }}>
          Every plan includes credits each month. A credit is one unit of Yara&apos;s work — sending a text or email, building a campaign, or handling a reply. When she runs low, top up anytime. Base rate is 10¢ per credit, cheaper in bulk.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '2rem' }}>

          {/* What burns credits */}
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              What uses credits
            </div>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'left' }}>Action</th>
                    <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {CREDIT_ACTIONS.map((row, i) => (
                    <tr key={row.action} style={{ borderBottom: i < CREDIT_ACTIONS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{row.action}</td>
                      <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--violet)', textAlign: 'right' }}>{row.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Credit packs */}
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Buy extra credits
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              {CREDIT_PACKS.map(pack => (
                <div key={pack.credits} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.25rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1.375rem', fontWeight: 800, marginBottom: '4px' }}>
                    {pack.credits.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>credits</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1.125rem', fontWeight: 700, margin: '6px 0 2px' }}>${pack.price}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>{centsPerCredit(pack)}¢ per credit</div>
                  {pack.tag && (
                    <div style={{ display: 'inline-block', fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(74,222,128,0.15)', color: '#15803d', padding: '2px 8px', borderRadius: '20px', marginBottom: '10px' }}>
                      {pack.tag}
                    </div>
                  )}
                  {!pack.tag && <div style={{ marginBottom: '10px', height: '20px' }} />}
                  <button
                    onClick={() => handleBuyCredits(pack.id)}
                    disabled={loading === pack.id}
                    style={{ width: '100%', backgroundColor: loading === pack.id ? 'var(--violet)' : 'transparent', color: loading === pack.id ? '#fff' : 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 600, padding: '0.45rem', fontSize: '0.8125rem', cursor: loading === pack.id ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: loading === pack.id ? 0.7 : 1, transition: 'all 0.15s' }}
                  >
                    {loading === pack.id ? 'Redirecting…' : 'Buy credits'}
                  </button>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '1rem', lineHeight: 1.6 }}>
              Plan credits reset each month. Purchased top-up credits never expire. Turn on auto-refill so Yara never stops mid-campaign.
            </p>
          </div>
        </div>

        {/* ── POS connectors ── */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '3.5rem 0' }} />

        <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Works with your POS
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          Business includes 1 POS connection. Business Pro supports up to 3 POS connections and locations. Need more? Custom has unlimited.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {[
            { name: 'Square',      live: true,  soon: false },
            { name: 'Toast',       live: false, soon: true  },
            { name: 'Clover',      live: false, soon: true  },
            { name: 'Lightspeed',  live: false, soon: false },
            { name: 'Shopify POS', live: false, soon: false },
            { name: 'Mindbody',    live: false, soon: false },
            { name: 'Revel',       live: false, soon: false },
            { name: 'Heartland',   live: false, soon: false },
          ].map(pos => (
            <span key={pos.name} style={{
              display: 'inline-block',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              border: '1px solid var(--border)',
              backgroundColor: pos.live ? 'rgba(74,222,128,0.12)' : 'var(--surface)',
              color: pos.live ? '#4ade80' : pos.soon ? 'var(--violet)' : 'var(--text-secondary)',
            }}>
              {pos.live ? '● ' : pos.soon ? '◎ ' : '○ '}
              {pos.name}
              {pos.live ? ' — Live' : pos.soon ? ' — Coming Q3' : ''}
            </span>
          ))}
        </div>

      </div>
    </div>
  )
}
