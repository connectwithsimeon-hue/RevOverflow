/**
 * GoalModeWidget — merchant sets a monthly revenue goal,
 * Yara shows progress + autonomous execution plan.
 *
 * States:
 *   No goal set   → prompt to set one
 *   Goal active   → progress ring + plan + status
 *   Goal achieved → celebration state
 */
'use client'

import { useState, useEffect } from 'react'

interface GoalAction {
  week: number
  trigger: string
  description: string
  estimatedRevenue: number
  status: 'pending' | 'executing' | 'done'
}

interface GoalData {
  goalAmount: number
  goalMonth: string
  revenueToDate: number
  revenueAttributed: number
  percentToGoal: number
  daysLeft: number
  status: 'on_track' | 'at_risk' | 'achieved' | 'no_goal'
  projectedEndOfMonth: number
  weeklyRunRate: number
  plan: GoalAction[]
}

const STATUS_COLOR: Record<string, string> = {
  on_track: '#4ade80',
  at_risk:  '#fbbf24',
  achieved: '#7c5cfc',
  no_goal:  'rgba(255,255,255,0.3)',
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function GoalModeWidget() {
  const [goal, setGoal]       = useState<GoalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [setting, setSetting] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving]   = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/goal')
      .then(r => r.json())
      .then(d => { if (!d.error) setGoal(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveGoal() {
    const amount = parseFloat(inputVal.replace(/[^0-9.]/g, ''))
    if (!amount) return
    setSaving(true)
    try {
      const res  = await fetch('/api/goal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) })
      const data = await res.json()
      setGoal(data)
      setSetting(false)
      setExpanded(true)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  if (loading) return null

  // ── No goal set ────────────────────────────────────────────────────────
  if (!goal || goal.status === 'no_goal' || goal.goalAmount === 0) {
    if (setting) {
      return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.75rem' }}>✦ Set a revenue goal for this month</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            Yara will build a campaign plan to hit your target and execute it autonomously.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}>
              <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 600 }}>$</span>
              <input
                type="number"
                placeholder="5000"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveGoal()}
                autoFocus
                style={{
                  width: '100%', padding: '0.625rem 0.875rem 0.625rem 1.75rem',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
                  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '1rem',
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
            <button
              onClick={handleSaveGoal}
              disabled={saving}
              style={{
                background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: '8px',
                padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.875rem',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit',
              }}
            >
              {saving ? 'Saving…' : 'Set goal →'}
            </button>
            <button
              onClick={() => setSetting(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }

    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.125rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>✦ Goal Mode</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Set a monthly revenue target — Yara will build a plan to hit it.</div>
        </div>
        <button
          onClick={() => setSetting(true)}
          style={{ background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.5rem 1.125rem', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
        >
          Set goal →
        </button>
      </div>
    )
  }

  const color     = STATUS_COLOR[goal.status]
  const statusLabel = goal.status === 'achieved' ? '🏆 Goal achieved!'
    : goal.status === 'on_track' ? '✅ On track'
    : '⚠️ At risk'

  const pct = Math.min(100, goal.percentToGoal)

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${color}40`, borderRadius: '14px', padding: '1.125rem 1.25rem', marginBottom: '1.5rem' }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Circular progress */}
        <svg width="48" height="48" style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="24" cy="24" r="20" fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={`${(pct / 100) * 125.6} 125.6`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>✦ Goal Mode — {fmt(goal.revenueToDate)} / {fmt(goal.goalAmount)}</span>
            <span style={{ background: `${color}20`, color, borderRadius: '6px', padding: '0.0625rem 0.5rem', fontSize: '0.6875rem', fontWeight: 700 }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            {goal.daysLeft} days left · Projected {fmt(goal.projectedEndOfMonth)} · {goal.percentToGoal}% complete
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Revenue to date',    val: fmt(goal.revenueToDate)         },
              { label: 'Yara attributed',    val: fmt(goal.revenueAttributed)     },
              { label: 'Weekly run rate',    val: fmt(goal.weeklyRunRate)         },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.625rem 0.75rem' }}>
                <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>{s.label}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Execution plan */}
          {goal.plan.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.625rem', color: 'rgba(255,255,255,0.6)' }}>
                YARA'S PLAN TO CLOSE THE GAP
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {goal.plan.map((action, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    <div style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: 'rgba(124,92,252,0.2)', color: 'var(--violet)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700, flexShrink: 0 }}>
                      W{action.week}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.125rem' }}>{action.description}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)' }}>
                        Est. {fmt(action.estimatedRevenue)} recovered
                      </div>
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                      {action.status === 'done' ? '✓' : action.status === 'executing' ? '⚡' : '○'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Change goal link */}
          <div style={{ marginTop: '0.875rem', textAlign: 'right' }}>
            <button
              onClick={() => { setSetting(true); setExpanded(false) }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Change goal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
