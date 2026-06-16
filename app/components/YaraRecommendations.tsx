/**
 * YaraRecommendations — client component
 *
 * Fetches the top opportunities from /api/insights and shows them as
 * one-tap approve cards on the dashboard. Each card shows:
 *   - What Yara wants to do
 *   - How many customers it affects
 *   - Estimated revenue
 *   - An Approve button (navigates to the action) + a Dismiss button
 *
 * Dismissed cards are stored in localStorage and hidden for 7 days.
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Opportunity {
  id: string
  type: string
  title: string
  description: string
  estimatedRevenue: number
  effort: string
  urgency: string
  customerCount: number
  actionRoute?: string
  actionLabel?: string
}

const URGENCY_COLOR: Record<string, string> = {
  now:      '#f87171',
  soon:     '#fbbf24',
  whenever: '#4ade80',
}

const EFFORT_LABEL: Record<string, string> = {
  instant: '⚡ Instant',
  low:     '🟢 Low effort',
  medium:  '🟡 Medium effort',
}

const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000   // 7 days

function getDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem('yara_dismissed') ?? '{}')
  } catch { return {} }
}

function dismiss(id: string) {
  const d = getDismissed()
  d[id] = Date.now() + DISMISS_TTL
  localStorage.setItem('yara_dismissed', JSON.stringify(d))
}

function isDismissed(id: string): boolean {
  const d = getDismissed()
  return !!d[id] && d[id] > Date.now()
}

export default function YaraRecommendations() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading]             = useState(true)
  const [dismissed, setDismissed]         = useState<Set<string>>(new Set())

  useEffect(() => {
    // Pre-filter dismissed
    const dismissedSet = new Set(
      Object.entries(getDismissed())
        .filter(([, exp]) => exp > Date.now())
        .map(([id]) => id)
    )
    setDismissed(dismissedSet)

    fetch('/api/insights')
      .then(r => r.json())
      .then(d => {
        if (d.gaps?.opportunities) {
          setOpportunities(d.gaps.opportunities.filter((o: Opportunity) => !dismissedSet.has(o.id)))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function handleDismiss(id: string) {
    dismiss(id)
    setDismissed(prev => new Set(Array.from(prev).concat(id)))
    setOpportunities(prev => prev.filter(o => o.id !== id))
  }

  const visible = opportunities.filter(o => !dismissed.has(o.id)).slice(0, 3)

  if (loading) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>✦ Yara is thinking…</div>
      </div>
    )
  }

  if (visible.length === 0) return null

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.9375rem' }}>✦ Yara Recommendations</span>
        <span style={{ background: 'rgba(124,92,252,0.15)', color: 'var(--violet)', borderRadius: '100px', padding: '0.125rem 0.625rem', fontSize: '0.75rem', fontWeight: 700 }}>
          {visible.length} opportunity{visible.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {visible.map(opp => (
          <div
            key={opp.id}
            style={{
              background: 'var(--surface)',
              border: `1px solid ${opp.urgency === 'now' ? 'rgba(248,113,113,0.25)' : 'var(--border)'}`,
              borderRadius: '14px',
              padding: '1.125rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                  <span style={{
                    background: `${URGENCY_COLOR[opp.urgency]}20`,
                    color: URGENCY_COLOR[opp.urgency],
                    borderRadius: '6px', padding: '0.125rem 0.5rem',
                    fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                  }}>
                    {opp.urgency === 'now' ? '🔴 Act now' : opp.urgency === 'soon' ? '🟡 Soon' : '🟢 Whenever'}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem' }}>
                    {EFFORT_LABEL[opp.effort]}
                  </span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>
                  {opp.title}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                  {opp.description}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, color: '#4ade80', fontSize: '1rem' }}>
                    {fmt(opp.estimatedRevenue)} potential
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem' }}>
                    {opp.customerCount} customers
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              {opp.actionRoute && (
                <Link
                  href={opp.actionRoute}
                  style={{
                    background: 'var(--violet)', color: '#fff',
                    borderRadius: '8px', padding: '0.5rem 1.125rem',
                    fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  {opp.actionLabel ?? 'Take action →'}
                </Link>
              )}
              <button
                onClick={() => handleDismiss(opp.id)}
                style={{
                  background: 'transparent', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', borderRadius: '8px',
                  padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.875rem',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
