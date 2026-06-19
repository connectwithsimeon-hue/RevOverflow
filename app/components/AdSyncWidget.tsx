/**
 * AdSyncWidget — shows Facebook/Google ad audience sync status and a
 * "Sync now" button. Account ID inputs live in the server-rendered form
 * on the Account page; this widget just handles the live status + sync action.
 */
'use client'

import { useState, useEffect } from 'react'

interface SyncStatus {
  metaConnected: boolean
  metaAudienceLive: boolean
  metaLookalikeLive: boolean
  googleConnected: boolean
  googleListLive: boolean
  lastSyncAt: string | null
}

export default function AdSyncWidget() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/integrations/ads/sync')
      .then(r => r.json())
      .then(d => { if (!d.error) setStatus(d) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSync() {
    setSyncing(true)
    setMessage(null)
    try {
      const res = await fetch('/api/integrations/ads/sync', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        const metaMsg = data.result?.meta
          ? `Facebook: ${data.result.meta.error ? `error — ${data.result.meta.error}` : `${data.result.meta.suppressionSynced} customers synced`}`
          : null
        const googleMsg = data.result?.google
          ? `Google Ads: ${data.result.google.error ? `error — ${data.result.google.error}` : `${data.result.google.suppressionSynced} customers synced`}`
          : null
        setMessage([metaMsg, googleMsg].filter(Boolean).join(' · ') || 'No ad accounts connected yet.')

        const refreshed = await fetch('/api/integrations/ads/sync').then(r => r.json())
        if (!refreshed.error) setStatus(refreshed)
      } else {
        setMessage(data.error || 'Sync failed')
      }
    } catch {
      setMessage('Sync failed — network error')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return null

  const anyConnected = status?.metaConnected || status?.googleConnected

  return (
    <div style={{ marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginBottom: '1rem' }}>
        <StatusPill label="Facebook suppression" live={!!status?.metaAudienceLive} connected={!!status?.metaConnected} />
        <StatusPill label="Facebook lookalike" live={!!status?.metaLookalikeLive} connected={!!status?.metaConnected} />
        <StatusPill label="Google Ads suppression" live={!!status?.googleListLive} connected={!!status?.googleConnected} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleSync}
          disabled={syncing || !anyConnected}
          style={{
            background: anyConnected ? 'var(--violet)' : 'rgba(21,21,31,0.08)',
            color: anyConnected ? '#fff' : 'var(--text-secondary)',
            border: 'none', borderRadius: '8px', padding: '0.625rem 1.25rem',
            fontWeight: 700, fontSize: '0.875rem', cursor: anyConnected ? 'pointer' : 'not-allowed',
            opacity: syncing ? 0.7 : 1, fontFamily: 'inherit',
          }}
        >
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
        {status?.lastSyncAt && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            Last synced {new Date(status.lastSyncAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        )}
      </div>

      {message && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.75rem', lineHeight: 1.6 }}>
          {message}
        </p>
      )}
    </div>
  )
}

function StatusPill({ label, live, connected }: { label: string; live: boolean; connected: boolean }) {
  const color = !connected ? 'rgba(21,21,31,0.3)' : live ? '#4ade80' : '#fbbf24'
  const text = !connected ? 'Not connected' : live ? 'Live' : 'Connected — not synced yet'
  return (
    <div style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.125rem' }}>{label}</div>
      <div style={{ color }}>{text}</div>
    </div>
  )
}
