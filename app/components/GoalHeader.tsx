'use client'

/**
 * GoalHeader — the three "Goal trio" cards at the top of the dashboard,
 * matching the homepage hero mockup: Revenue Goal · Generated so far · Gap.
 * Fetches /api/goal; if no goal is set, shows a clean inline set-goal prompt.
 */
import { useEffect, useState } from 'react'

interface GoalData {
  goalAmount: number
  revenueToDate: number
  revenueAttributed: number
  percentToGoal: number
  daysLeft: number
  status: 'on_track' | 'at_risk' | 'achieved' | 'no_goal'
  baseline?: { avgMonthlyRevenue: number; avgTicket: number }
}

/** Yara's plain-language reality check on a proposed goal. */
function realism(amount: number, b?: { avgMonthlyRevenue: number; avgTicket: number }) {
  if (!amount || !b || b.avgMonthlyRevenue <= 0) return null
  const ratio = amount / b.avgMonthlyRevenue
  const visits = b.avgTicket > 0 ? Math.ceil(amount / b.avgTicket) : 0
  const visitsLine = visits ? ` ~${visits.toLocaleString()} sales at your ${money(b.avgTicket)} average.` : ''
  if (ratio > 2.5) {
    const suggest = Math.round((b.avgMonthlyRevenue * 1.3) / 100) * 100
    return { color: '#b91c1c', text: `That's ${ratio.toFixed(1)}× your ${money(b.avgMonthlyRevenue)}/mo base — honestly out of reach this month. A realistic stretch is about ${money(suggest)}.` }
  }
  if (ratio > 1.3) return { color: '#92400e', text: `Ambitious — about ${ratio.toFixed(1)}× your usual ${money(b.avgMonthlyRevenue)}/mo. I'll push hard.${visitsLine}` }
  if (ratio > 0.7) return { color: '#15803d', text: `A realistic stretch above your ${money(b.avgMonthlyRevenue)}/mo average.${visitsLine}` }
  return { color: '#15803d', text: `Comfortably within reach — you average ${money(b.avgMonthlyRevenue)}/mo.${visitsLine}` }
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function GoalHeader() {
  const [goal, setGoal] = useState<GoalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    fetch('/api/goal').then(r => r.json()).then(d => { if (!d.error) setGoal(d) }).finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function save() {
    const n = parseInt(amount.replace(/[^0-9]/g, ''))
    if (!n) return
    setSaving(true)
    try {
      await fetch('/api/goal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: n }) })
      setEditing(false)
      setLoading(true)
      load()
    } finally { setSaving(false) }
  }

  if (loading) return <div style={{ height: 116, ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>Loading your goal…</div>

  const noGoal = !goal || goal.status === 'no_goal' || goal.goalAmount === 0

  if (noGoal || editing) {
    return (
      <div style={{ ...card, padding: '1.5rem 1.75rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: 4 }}>
          {editing ? 'Update your revenue goal' : 'Set your revenue goal for this month'}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 14 }}>
          Tell Yara the number — she builds the plan to hit it.
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 700 }}>$</span>
            <input
              autoFocus value={amount} onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && save()}
              placeholder="25,000"
              style={{ padding: '0.7rem 0.9rem 0.7rem 1.7rem', borderRadius: 10, border: '1px solid var(--border)', fontSize: 16, fontWeight: 700, width: 160, fontFamily: 'inherit', background: 'var(--ink-light)', color: 'var(--text-primary)' }}
            />
          </div>
          <button onClick={save} disabled={saving} style={primaryBtn}>{saving ? 'Saving…' : 'Set goal →'}</button>
          {editing && <button onClick={() => setEditing(false)} style={ghostBtn}>Cancel</button>}
        </div>
        {(() => {
          const r = realism(parseInt(amount.replace(/[^0-9]/g, '')) || 0, goal?.baseline)
          if (!r) return null
          return (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.5, color: r.color }}>
              <span style={{ flexShrink: 0 }}>✦</span><span><b>Yara:</b> {r.text}</span>
            </div>
          )
        })()}
      </div>
    )
  }

  const gap = Math.max(0, goal!.goalAmount - goal!.revenueToDate)
  const pct = Math.min(100, Math.round(goal!.percentToGoal))

  const b = goal!.baseline
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <Stat
          label="REVENUE GOAL" icon="🎯"
          value={money(goal!.goalAmount)}
          foot={<button onClick={() => { setAmount(String(goal!.goalAmount)); setEditing(true) }} style={linkBtn}>Edit goal →</button>}
        />
        <Stat
          label="GENERATED SO FAR" icon="📈"
          value={money(goal!.revenueToDate)}
          foot={<span style={{ color: pct >= 100 ? '#15803d' : 'var(--violet)', fontWeight: 700, fontSize: 13 }}>{pct}% to goal</span>}
        />
        <Stat
          label="GAP TO GOAL" icon="⚡"
          value={money(gap)}
          foot={<span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{goal!.daysLeft} day{goal!.daysLeft === 1 ? '' : 's'} left</span>}
        />
      </div>
      {b && b.avgMonthlyRevenue > 0 && (
        <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          Based on your last 90 days: about <b style={{ color: 'var(--text-primary)' }}>{money(b.avgMonthlyRevenue)}/mo</b> and <b style={{ color: 'var(--text-primary)' }}>{money(b.avgTicket)}</b> per sale.
          {gap > 0 && b.avgTicket > 0 && <> To close the gap, Yara needs about <b style={{ color: 'var(--text-primary)' }}>{Math.ceil(gap / b.avgTicket).toLocaleString()}</b> more sales.</>}
        </div>
      )}
    </div>
  )
}

function Stat({ label, icon, value, foot }: { label: string; icon: string; value: string; foot: React.ReactNode }) {
  return (
    <div style={card as React.CSSProperties}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: 15 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
      <div style={{ marginTop: 8 }}>{foot}</div>
    </div>
  )
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem 1.4rem' }
const primaryBtn: React.CSSProperties = { background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, padding: '0.7rem 1.25rem', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }
const ghostBtn: React.CSSProperties = { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 600, padding: '0.7rem 1rem', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }
const linkBtn: React.CSSProperties = { background: 'none', border: 'none', color: 'var(--violet)', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }
