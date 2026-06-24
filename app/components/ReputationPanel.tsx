/**
 * ReputationPanel — client component
 *
 * Connect a Google listing (Place ID), then show current rating, the trend vs.
 * the last check, and recent reviews with negative ones flagged. Monitoring
 * uses one RevOverflow Google Places key — no per-merchant Google login.
 */
'use client'

import { useEffect, useState } from 'react'

interface Review { author: string; rating: number; text: string; relative: string }
interface Reputation {
  google_place_id: string | null
  business_name: string | null
  rating: number | null
  review_count: number | null
  prev_rating: number | null
  prev_review_count: number | null
  recent_reviews: Review[] | null
  last_checked_at: string | null
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '0.625rem 0.75rem', fontSize: '0.9375rem', fontFamily: 'inherit', background: 'var(--surface)' }

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating)
  return <span style={{ color: '#f59e0b', letterSpacing: '1px' }}>{'★'.repeat(full)}<span style={{ color: 'var(--border)' }}>{'★'.repeat(5 - full)}</span></span>
}

export default function ReputationPanel() {
  const [rep, setRep] = useState<Reputation | null>(null)
  const [configured, setConfigured] = useState(true)
  const [placeId, setPlaceId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showHelp, setShowHelp] = useState(true)

  useEffect(() => {
    fetch('/api/reputation')
      .then((r) => r.json())
      .then((d) => {
        setRep(d.reputation ?? null)
        setConfigured(d.configured !== false)
        if (d.reputation?.google_place_id) setPlaceId(d.reputation.google_place_id)
        if (d.reputation?.business_name) setBusinessName(d.reputation.business_name)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function connect() {
    setSaving(true)
    try {
      const res = await fetch('/api/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId: placeId.trim(), businessName: businessName.trim() }),
      })
      const d = await res.json()
      if (d.error) { alert(d.error); return }
      setRep(d.reputation ?? null)
      setConfigured(d.configured !== false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</div>

  const connected = !!rep?.google_place_id
  const hasData = connected && rep?.rating != null
  const ratingDelta = rep?.rating != null && rep?.prev_rating != null ? +(rep.rating - rep.prev_rating).toFixed(1) : null
  const newReviews = rep?.review_count != null && rep?.prev_review_count != null ? rep.review_count - rep.prev_review_count : null

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Connect form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 700, marginBottom: '1rem' }}>{connected ? 'Connected Google listing' : 'Connect your Google listing'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Business name</label>
            <input style={inputStyle} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business name on Google" />
          </div>
          <div>
            <label style={labelStyle}>Google Place ID</label>
            <input style={inputStyle} value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="ChIJ…" />

            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              style={{ marginTop: '0.5rem', background: 'none', border: 'none', padding: 0, color: 'var(--violet)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {showHelp ? '▾' : '▸'} How do I find my Place ID? (30 seconds)
            </button>

            {showHelp && (
              <div style={{ marginTop: '0.625rem', background: 'rgba(124,92,252,0.06)', border: '1px solid rgba(124,92,252,0.2)', borderRadius: 12, padding: '1rem' }}>
                <ol style={{ margin: '0 0 0.875rem', paddingLeft: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  <li>Click <strong>Open Place ID Finder</strong> below (opens in a new tab).</li>
                  <li>In the search box on the map, type your <strong>business name and city</strong> — e.g. &quot;Sparkle Car Wash, Austin&quot;.</li>
                  <li>Click your business on the map. A small box pops up showing your <strong>Place ID</strong>.</li>
                  <li>Copy the long ID that starts with <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0 4px', borderRadius: 4 }}>ChIJ…</code> and paste it in the box above.</li>
                </ol>
                <a
                  href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block', background: 'var(--violet)', color: '#fff', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.8125rem', textDecoration: 'none' }}
                >
                  Open Place ID Finder →
                </a>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.625rem', marginBottom: 0 }}>
                  It&apos;s free and needs no login. Tip: it&apos;s the same business listing customers see when they Google you.
                </p>
              </div>
            )}
          </div>
          <button onClick={connect} disabled={saving || !placeId.trim()} style={{ alignSelf: 'flex-start', background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem 1.75rem', fontWeight: 700, fontSize: '0.9375rem', cursor: saving || !placeId.trim() ? 'default' : 'pointer', opacity: saving || !placeId.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
            {saving ? 'Connecting…' : connected ? 'Update listing' : 'Connect & check reviews'}
          </button>
        </div>
      </div>

      {!configured && connected && (
        <div style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: '#92400e' }}>
          Listing saved. Live review monitoring switches on once a Google Places API key is added to the app environment.
        </div>
      )}

      {hasData && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>Rating</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800 }}>{rep!.rating?.toFixed(1)}</div>
              <div style={{ fontSize: '0.875rem' }}><Stars rating={rep!.rating ?? 0} /></div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>Reviews</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800 }}>{rep!.review_count?.toLocaleString()}</div>
              {newReviews != null && newReviews > 0 && <div style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 700 }}>+{newReviews} new</div>}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.375rem' }}>Trend</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, color: ratingDelta == null ? 'inherit' : ratingDelta < 0 ? '#c2410c' : ratingDelta > 0 ? '#15803d' : 'inherit' }}>
                {ratingDelta == null ? '—' : ratingDelta === 0 ? 'Steady' : `${ratingDelta > 0 ? '↑' : '↓'} ${Math.abs(ratingDelta)}`}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>since last check</div>
            </div>
          </div>

          {rep!.recent_reviews && rep!.recent_reviews.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '1rem' }}>Recent reviews</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {rep!.recent_reviews.map((rv, i) => {
                  const negative = rv.rating <= 3
                  return (
                    <div key={i} style={{ borderLeft: `3px solid ${negative ? '#f87171' : '#4ade80'}`, paddingLeft: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rv.author}</span>
                        <span style={{ fontSize: '0.8125rem' }}><Stars rating={rv.rating} /></span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{rv.relative}</span>
                        {negative && <span style={{ background: 'rgba(248,113,113,0.15)', color: '#b91c1c', borderRadius: 6, padding: '0.1rem 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>Needs recovery</span>}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rv.text || <em>No comment left.</em>}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
