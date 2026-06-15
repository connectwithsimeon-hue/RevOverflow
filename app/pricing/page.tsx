'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLANS = [
  {
    id: 'capture',
    name: 'Capture',
    price: 97,
    description: 'Start knowing your customers',
    features: [
      'Square sync & RFV scoring',
      'Customer segmentation dashboard',
      'Up to 500 customers',
      'Email support',
    ],
    highlight: false,
  },
  {
    id: 'core',
    name: 'Core',
    price: 297,
    description: 'Win back lapsed customers',
    features: [
      'Everything in Capture',
      'Win-back email campaigns',
      'Control group revenue attribution',
      'Campaign performance analytics',
      'Up to 2,500 customers',
    ],
    highlight: true,
  },
  {
    id: 'brain',
    name: 'Brain',
    price: 597,
    description: 'Yara runs on autopilot',
    features: [
      'Everything in Core',
      'Automated win-back triggers',
      'SMS campaigns (Twilio)',
      'Multi-location support',
      'Up to 10,000 customers',
      'Priority support',
    ],
    highlight: false,
  },
  {
    id: 'empire',
    name: 'Empire',
    price: 1197,
    description: 'Built for serious operators',
    features: [
      'Everything in Brain',
      'Unlimited customers',
      'White-glove onboarding',
      'Dedicated success manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    highlight: false,
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleSubscribe(planId: string) {
    setLoading(planId)
    setError('')
    try {
      const res = await fetch('/api/billing/checkout', {
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

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.125rem' }}>
            Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
          </span>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← Dashboard</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Simple, transparent pricing
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', maxWidth: '480px', margin: '0 auto' }}>
            Yara pays for herself. Most merchants see 3–10× ROI in the first 60 days.
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '2rem', color: '#f87171', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Plan grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              style={{
                backgroundColor: plan.highlight ? 'rgba(124,92,252,0.1)' : 'var(--surface)',
                border: plan.highlight ? '2px solid var(--violet)' : '1px solid var(--border)',
                borderRadius: '20px',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {plan.highlight && (
                <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--violet)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 800, marginBottom: '0.25rem' }}>{plan.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>{plan.description}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.25rem', fontWeight: 800 }}>${plan.price}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>/month</span>
                </div>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', flex: 1 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '0.625rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: '#4ade80', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    {f}
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

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2rem' }}>
          All plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
