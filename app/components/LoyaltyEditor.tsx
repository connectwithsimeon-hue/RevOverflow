/**
 * LoyaltyEditor — client component
 *
 * Define a simple "earn a reward every N visits" program. RevOverflow tracks
 * each customer's visits and Yara nudges those who are close. No Square Loyalty
 * needed — it works off the visit data RevOverflow already has.
 */
'use client'

import { useEffect, useState } from 'react'

interface Loyalty { reward_name: string; visits_required: number; active: boolean }

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '0.625rem 0.75rem', fontSize: '0.9375rem', fontFamily: 'inherit', background: 'var(--surface)' }

export default function LoyaltyEditor() {
  const [reward, setReward] = useState('')
  const [visits, setVisits] = useState('10')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/loyalty')
      .then((r) => r.json())
      .then((d) => {
        const l: Loyalty | null = d.loyalty
        if (l) { setReward(l.reward_name ?? ''); setVisits(String(l.visits_required ?? 10)) }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardName: reward, visitsRequired: parseInt(visits) || 10, active: true }),
      })
      const d = await res.json()
      if (d.ok) setSaved(true)
      else alert(d.error || 'Could not save')
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</div>

  const n = parseInt(visits) || 10

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={labelStyle}>Reward</label>
          <input style={inputStyle} value={reward} onChange={(e) => setReward(e.target.value)} placeholder="e.g. Free wash, Free coffee, $10 off" />
        </div>
        <div>
          <label style={labelStyle}>Visits required to earn it</label>
          <input style={{ ...inputStyle, maxWidth: 140 }} type="number" min="2" max="100" value={visits} onChange={(e) => setVisits(e.target.value)} />
        </div>

        {reward && (
          <div style={{ background: 'rgba(124,92,252,0.06)', border: '1px solid rgba(124,92,252,0.2)', borderRadius: 12, padding: '1rem', fontSize: '0.875rem' }}>
            <strong>Your program:</strong> every <strong>{n}</strong> visits earns a <strong>{reward}</strong>. Yara will track each customer&apos;s visits and nudge anyone who&apos;s 1–2 visits away — and invite anyone who just earned a reward to come claim it.
          </div>
        )}

        <button
          onClick={save}
          disabled={saving || !reward}
          style={{ alignSelf: 'flex-start', background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem 1.75rem', fontWeight: 700, fontSize: '0.9375rem', cursor: saving || !reward ? 'default' : 'pointer', opacity: saving || !reward ? 0.6 : 1, fontFamily: 'inherit' }}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save loyalty program'}
        </button>
      </div>
    </div>
  )
}
