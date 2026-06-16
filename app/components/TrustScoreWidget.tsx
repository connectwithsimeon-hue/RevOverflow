/**
 * TrustScoreWidget — shows Yara's earned autonomy level
 *
 * Three visual states:
 *   Supervised (L0) — yellow warning: Yara is watching. You approve campaigns.
 *   Learning   (L1) — blue info: Yara is sending, notifying you each time.
 *   Trusted    (L2) — green: Yara runs weekly. You get a digest.
 *   Autonomous (L3) — violet: Full autopilot. Monthly digest.
 */
'use client'

import { useEffect, useState } from 'react'

interface TrustData {
  score: number
  level: 0 | 1 | 2 | 3
  levelName: string
  maxSendsPerDay: number
  requiresApproval: boolean
  factors: {
    daysActive: number
    revenueScore: number
    campaignScore: number
    optOutScore: number
    approvalBonus: number
  }
}

const LEVEL_COLOR: Record<number, string> = {
  0: '#fbbf24',   // yellow
  1: '#60a5fa',   // blue
  2: '#4ade80',   // green
  3: '#7c5cfc',   // violet
}

const LEVEL_ICON: Record<number, string> = {
  0: '👀',
  1: '📚',
  2: '✅',
  3: '🚀',
}

const LEVEL_DESCRIPTION: Record<number, string> = {
  0: 'Yara is watching and learning. Review and approve each campaign before it sends.',
  1: 'Yara sends automatically and notifies you after each one. You can override anytime.',
  2: 'Yara runs autonomously. You get a weekly digest showing what she sent and earned.',
  3: 'Full autopilot. Yara operates independently and sends a monthly performance report.',
}

export default function TrustScoreWidget() {
  const [trust, setTrust]     = useState<TrustData | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch('/api/trust')
      .then(r => r.json())
      .then(d => { if (!d.error) setTrust(d) })
      .catch(console.error)
  }, [])

  if (!trust) return null

  const color    = LEVEL_COLOR[trust.level]
  const nextScore = trust.level < 3 ? [25, 55, 80][trust.level] : 100
  const pct      = Math.round((trust.score / 100) * 100)

  return (
    <div style={{
      background:   'var(--surface)',
      border:       `1px solid ${color}40`,
      borderRadius: '14px',
      padding:      '1.125rem 1.25rem',
      marginBottom: '1.5rem',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Level badge */}
        <div style={{
          width: '2.25rem', height: '2.25rem',
          borderRadius: '10px',
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.125rem', flexShrink: 0,
        }}>
          {LEVEL_ICON[trust.level]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
              Yara Trust Level {trust.level} — {trust.levelName}
            </span>
            <span style={{
              background: `${color}20`, color,
              borderRadius: '6px', padding: '0.0625rem 0.5rem',
              fontSize: '0.6875rem', fontWeight: 700,
            }}>
              {trust.score}/100
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`,
              height: '100%',
              background: color,
              borderRadius: '100px',
              transition: 'width 0.6s ease',
            }} />
          </div>

          {trust.level < 3 && (
            <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.35)', marginTop: '0.25rem' }}>
              {nextScore - trust.score} more points to Level {trust.level + 1}
            </div>
          )}
        </div>

        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            {LEVEL_DESCRIPTION[trust.level]}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {[
              { label: 'Days active',         pts: trust.factors.daysActive,    max: 25 },
              { label: 'Revenue attributed',  pts: trust.factors.revenueScore,  max: 30 },
              { label: 'Campaigns sent',      pts: trust.factors.campaignScore, max: 20 },
              { label: 'Low opt-out rate',    pts: trust.factors.optOutScore,   max: 15 },
              { label: 'Manual approval',     pts: trust.factors.approvalBonus, max: 5  },
            ].map(f => (
              <div key={f.label} style={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '8px', padding: '0.625rem 0.75rem',
              }}>
                <div style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>
                  {f.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color }}>
                    {f.pts}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
                    / {f.max} pts
                  </span>
                </div>
              </div>
            ))}
          </div>

          {trust.requiresApproval && (
            <div style={{
              marginTop: '0.875rem',
              background: '#fbbf2415',
              border: '1px solid #fbbf2440',
              borderRadius: '8px',
              padding: '0.625rem 0.875rem',
              fontSize: '0.8125rem',
              color: '#fbbf24',
            }}>
              ⚠️ Campaigns require your approval until Yara reaches Level 1 (25 pts).
              Go to <a href="/campaigns" style={{ color: '#fbbf24', textDecoration: 'underline' }}>Campaigns</a> to approve pending sends.
            </div>
          )}

          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
            Daily send limit: <strong style={{ color: 'rgba(255,255,255,0.55)' }}>
              {trust.maxSendsPerDay === 9999 ? 'Unlimited' : trust.maxSendsPerDay} messages
            </strong>
          </div>
        </div>
      )}
    </div>
  )
}
