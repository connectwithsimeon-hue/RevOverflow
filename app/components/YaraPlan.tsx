'use client'

/**
 * YaraPlan — the "Yara's Plan" card from the homepage hero, wired to real
 * data. Pulls every agent's recommendations from /api/agents, ranks them by
 * estimated revenue, and shows the top opportunities to close the gap — each
 * with a Review button. Replaces the old separate Recommendations + Agents
 * widgets with one clean list.
 */
import { useEffect, useState } from 'react'

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
  status: 'active' | 'needs_data' | 'no_data'
  recommendations: Recommendation[]
}
interface Opportunity extends Recommendation {
  icon: string
  agentName: string
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function YaraPlan() {
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(d => {
      const agents: Agent[] = d.agents ?? []
      const flat: Opportunity[] = []
      for (const a of agents) {
        for (const rec of a.recommendations ?? []) {
          flat.push({ ...rec, icon: a.icon, agentName: a.name })
        }
      }
      flat.sort((x, y) => (y.estimatedRevenue ?? 0) - (x.estimatedRevenue ?? 0))
      setOpps(flat.slice(0, 5))
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '1.4rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.0625rem', margin: 0 }}>Yara&apos;s Plan</h2>
          <span style={{ background: 'var(--violet)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, letterSpacing: '0.04em' }}>AI</span>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, margin: '0 0 14px' }}>Top opportunities to close your revenue gap.</p>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '1.5rem 0', textAlign: 'center' }}>Yara is reviewing your customers…</div>
      ) : opps.length === 0 ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, padding: '1.5rem 0', textAlign: 'center' }}>
          No opportunities yet. Once your POS data syncs, Yara&apos;s plan appears here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opps.map((o, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '0.85rem 0.95rem',
              borderRadius: 12, border: '1px solid var(--border)', background: 'var(--ink)',
            }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{o.icon}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.detail}</div>
              </div>
              {o.estimatedRevenue ? (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>Est. revenue</div>
                  <div style={{ fontWeight: 800, color: '#15803d', fontSize: 14 }}>{money(o.estimatedRevenue)}</div>
                </div>
              ) : null}
              <a href={o.cta?.href ?? '/dashboard/campaigns'} style={{
                flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--violet)',
                fontWeight: 700, fontSize: 13, padding: '0.5rem 0.9rem', borderRadius: 9, textDecoration: 'none',
              }}>Review</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
