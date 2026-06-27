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
  agentId: string
}

// Agents whose opportunities Yara can send in one tap (campaign triggers).
// Everything else routes to its setup/review page instead.
const SENDABLE: Record<string, string> = {
  winback: 'win_back', flash: 'win_back', newcustomer: 'new_customer',
  vip: 'vip_reward', birthday: 'birthday', crosssell: 'cross_sell',
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

interface GoalLite { goalAmount: number; revenueToDate: number; daysLeft: number; status: string }

export default function YaraPlan() {
  const [opps, setOpps] = useState<Opportunity[]>([])
  const [goal, setGoal] = useState<GoalLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<Record<number, 'sending' | 'sent' | 'error'>>({})
  const [msg, setMsg] = useState<Record<number, string>>({})

  async function approve(i: number, trigger: string) {
    setStatus(s => ({ ...s, [i]: 'sending' }))
    try {
      const res = await fetch('/api/yara/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger }) })
      const d = await res.json()
      if (!res.ok || !d.ok) {
        setStatus(s => ({ ...s, [i]: 'error' })); setMsg(m => ({ ...m, [i]: d.error || 'Could not send.' })); return
      }
      setStatus(s => ({ ...s, [i]: 'sent' }))
      setMsg(m => ({ ...m, [i]: d.sent ? `Sent to ${d.sent} customer${d.sent === 1 ? '' : 's'}` : (d.reason === 'all_contacted_recently' ? 'Everyone was contacted recently' : 'No one to send to right now') }))
    } catch {
      setStatus(s => ({ ...s, [i]: 'error' })); setMsg(m => ({ ...m, [i]: 'Network error — try again' }))
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/agents').then(r => r.json()).catch(() => ({})),
      fetch('/api/goal').then(r => r.json()).catch(() => ({})),
    ]).then(([a, g]) => {
      const agents: Agent[] = a.agents ?? []
      const flat: Opportunity[] = []
      for (const ag of agents) {
        for (const rec of ag.recommendations ?? []) {
          flat.push({ ...rec, icon: ag.icon, agentName: ag.name, agentId: ag.id })
        }
      }
      flat.sort((x, y) => (y.estimatedRevenue ?? 0) - (x.estimatedRevenue ?? 0))
      setOpps(flat.slice(0, 5))
      if (!g.error) setGoal(g)
    }).finally(() => setLoading(false))
  }, [])

  const totalEst = opps.reduce((s, o) => s + (o.estimatedRevenue ?? 0), 0)
  let intro = 'Top opportunities to grow your revenue — approve any to send.'
  if (goal && goal.status !== 'no_goal' && goal.goalAmount > 0) {
    const gap = Math.max(0, goal.goalAmount - goal.revenueToDate)
    intro = gap > 0
      ? `You're ${money(gap)} from your ${money(goal.goalAmount)} goal with ${goal.daysLeft} day${goal.daysLeft === 1 ? '' : 's'} left. Here's how I'll close it — approve what you like:`
      : `You've hit your ${money(goal.goalAmount)} goal 🎉 — here's what I'm running to push further:`
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '1.4rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.0625rem', margin: 0 }}>Yara&apos;s Plan</h2>
          <span style={{ background: 'var(--violet)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6, letterSpacing: '0.04em' }}>AI</span>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, margin: '0 0 14px', lineHeight: 1.5 }}>{intro}</p>

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
              {(() => {
                const trigger = SENDABLE[o.agentId]
                const st = status[i]
                if (st === 'sent') return <span style={{ flexShrink: 0, color: '#15803d', fontWeight: 700, fontSize: 12.5, textAlign: 'right', maxWidth: 120 }}>✓ {msg[i]}</span>
                if (!trigger) {
                  return <a href={o.cta?.href ?? '/dashboard/campaigns'} style={btnGhost}>{o.cta?.label ?? 'Set up →'}</a>
                }
                if (st === 'sending') return <span style={{ ...btnSolid, opacity: 0.6 }}>Sending…</span>
                if (st === 'error') return (
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => approve(i, trigger)} style={btnSolid}>Try again</button>
                    <span style={{ color: '#b91c1c', fontSize: 10.5, maxWidth: 130, textAlign: 'right' }}>{msg[i]}</span>
                  </span>
                )
                return <button onClick={() => approve(i, trigger)} style={btnSolid}>Approve &amp; send</button>
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const btnSolid: React.CSSProperties = {
  flexShrink: 0, background: 'var(--violet)', border: '1px solid var(--violet)', color: '#fff',
  fontWeight: 700, fontSize: 13, padding: '0.5rem 1rem', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
}
const btnGhost: React.CSSProperties = {
  flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--violet)',
  fontWeight: 700, fontSize: 13, padding: '0.5rem 0.9rem', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap',
}
