'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'capture',
    name: 'Capture',
    price: 97,
    credits: 200,
    description: 'Start knowing your customers',
    features: [
      'Square POS sync',
      'RFV customer scoring & segmentation',
      'Customer dashboard',
      '200 Yara credits / month',
      'Email support',
    ],
    highlight: false,
    guarantee: false,
  },
  {
    id: 'core',
    name: 'Core',
    price: 297,
    credits: 1000,
    description: 'Win back lapsed customers',
    features: [
      'Everything in Capture',
      'AI-written win-back campaigns (all 5 triggers)',
      'Control group revenue attribution',
      'Campaign performance analytics',
      '1,000 Yara credits / month',
      '3× ROI guarantee in 60 days',
    ],
    highlight: true,
    guarantee: true,
  },
  {
    id: 'brain',
    name: 'Brain',
    price: 597,
    credits: 3000,
    description: 'Yara runs on autopilot',
    features: [
      'Everything in Core',
      'Autonomous daily campaigns — no manual work',
      'SMS + email delivery',
      'Square promo code generator',
      '3,000 Yara credits / month',
      '3× ROI guarantee in 60 days',
    ],
    highlight: false,
    guarantee: true,
  },
  {
    id: 'empire',
    name: 'Empire',
    price: 1197,
    credits: 10000,
    description: 'Multi-location operators',
    features: [
      'Everything in Brain',
      'Multi-location support',
      'Clover + Toast POS adapters',
      '10,000 Yara credits / month',
      'White-glove onboarding',
      'Dedicated success manager',
      '3× ROI guarantee in 60 days',
    ],
    highlight: false,
    guarantee: true,
  },
  {
    id: 'network',
    name: 'Network',
    price: 2997,
    credits: 30000,
    description: 'Franchise & multi-brand',
    features: [
      'Everything in Empire',
      'Franchise / multi-brand dashboard',
      'Revenue Commander features',
      'Facebook audience sync',
      '30,000 Yara credits / month',
      'SLA guarantee',
    ],
    highlight: false,
    guarantee: true,
  },
]

const CREDIT_PACKS = [
  { id: 'pack_1000',  credits: 1000,  price: 15,  perK: 15, tag: '' },
  { id: 'pack_5000',  credits: 5000,  price: 60,  perK: 12, tag: 'Save 20%' },
  { id: 'pack_15000', credits: 15000, price: 150, perK: 10, tag: 'Save 33%' },
  { id: 'pack_50000', credits: 50000, price: 400, perK: 8,  tag: 'Save 47%' },
]

const CREDIT_ACTIONS = [
  { action: 'AI win-back email generated',   cost: 2  },
  { action: 'SMS message sent',              cost: 5  },
  { action: 'Yara targeting decision',       cost: 1  },
  { action: 'Campaign analysis report',      cost: 10 },
  { action: 'Extra POS connection / month',  cost: 50 },
  { action: 'Inbound reply handled by Yara', cost: 3  },
  { action: 'Customer import (per 100)',      cost: 5  },
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
          All plans include a 14-day free trial. Cancel anytime. Credits roll over monthly.
        </p>

        {/* ── Credits section ── */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '3.5rem 0' }} />

        <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Yara Credits
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '2rem', maxWidth: '560px' }}>
          Every plan includes credits each month. When Yara does more — sends more emails, texts customers, adds a new POS — she burns credits. Buy more anytime, just like you would with OpenAI or Anthropic.
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>${pack.perK} per 1,000</div>
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
              Credits roll over monthly. Auto-refill available so Yara never stops mid-campaign. Unused credits never expire on Brain and Empire plans.
            </p>
          </div>
        </div>

        {/* ── POS connectors ── */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '3.5rem 0' }} />

        <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Works with your POS
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
          First POS connection is free on every plan. Additional locations or systems use credits (50 / month each).
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
