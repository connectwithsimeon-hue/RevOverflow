/**
 * AgentsWidget — client component
 *
 * Shows Yara's full team of revenue agents on the dashboard. Each card shows
 * the agent, a status badge (Active / Connect data), its headline finding, and
 * its top recommendation with a one-tap action. Data-gated agents stay visible
 * but clearly show what to connect to switch them on — so the merchant sees the
 * complete product while Yara stays honest about what's running.
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Recommendation {
  title: string
  detail: string
  estimatedRevenue?: number
  cta?: { label: string; href: string }
}

interface Agent {
  id: string
  name: string
  icon: string
  tagline: string
  status: 'active' | 'needs_data' | 'no_data'
  statusLabel: string
  headline: string
  recommendations: Recommendation[]
  dataNeeded?: string
}

const STATUS_STYLE: Record<Agent['status'], { bg: string; color: string }> = {
  active:     { bg: 'rgba(74,222,128,0.15)', color: '#15803d' },
  needs_data: { bg: 'rgba(251,191,36,0.15)', color: '#92400e' },
  no_data:    { bg: 'rgba(21,21,31,0.06)',   color: 'var(--text-secondary)' },
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function AgentsWidget() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/agents')
      .then((r) => r.json())
      .then((d) => { if (d.agents) setAgents(d.agents) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>✦ Yara&apos;s agents are checking in…</div>
      </div>
    )
  }

  if (agents.length === 0) return null

  const activeCount = agents.filter((a) => a.status === 'active').length

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.9375rem' }}>🤖 Yara&apos;s Revenue Agents</span>
        <span style={{ background: 'rgba(124,92,252,0.15)', color: 'var(--violet)', borderRadius: '100px', padding: '0.125rem 0.625rem', fontSize: '0.75rem', fontWeight: 700 }}>
          {activeCount} of {agents.length} active
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
        {agents.map((agent) => {
          const st = STATUS_STYLE[agent.status]
          const isOpen = openId === agent.id
          const topRec = agent.recommendations[0]
          return (
            <div
              key={agent.id}
              style={{
                background: 'var(--surface)',
                border: `1px solid ${agent.status === 'active' ? 'rgba(124,92,252,0.25)' : 'var(--border)'}`,
                borderRadius: '14px',
                padding: '1.125rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.625rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>{agent.icon}</span>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '0.9375rem' }}>{agent.name}</span>
                </div>
                <span style={{ background: st.bg, color: st.color, borderRadius: '6px', padding: '0.125rem 0.5rem', fontSize: '0.6875rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {agent.statusLabel}
                </span>
              </div>

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.625rem' }}>{agent.tagline}</div>

              <div style={{ fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.45, marginBottom: '0.75rem' }}>{agent.headline}</div>

              {topRec && (
                <div style={{ marginTop: 'auto' }}>
                  {topRec.estimatedRevenue ? (
                    <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
                      +{fmt(topRec.estimatedRevenue)}/mo potential
                    </div>
                  ) : null}
                  {isOpen && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>{topRec.detail}</div>
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {topRec.cta && (
                      <Link href={topRec.cta.href} style={{ background: 'var(--violet)', color: '#fff', borderRadius: '8px', padding: '0.4375rem 0.875rem', fontWeight: 700, fontSize: '0.8125rem', textDecoration: 'none' }}>
                        {topRec.cta.label}
                      </Link>
                    )}
                    <button
                      onClick={() => setOpenId(isOpen ? null : agent.id)}
                      style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.4375rem 0.75rem', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {isOpen ? 'Less' : 'Details'}
                    </button>
                  </div>
                </div>
              )}

              {!topRec && agent.dataNeeded && (
                <div style={{ marginTop: 'auto', color: 'var(--text-secondary)', fontSize: '0.78rem', lineHeight: 1.45, fontStyle: 'italic' }}>
                  To activate: {agent.dataNeeded}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
