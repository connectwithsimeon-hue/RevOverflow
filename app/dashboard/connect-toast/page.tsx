'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ConnectToastPage() {
  const router = useRouter()
  const [guid, setGuid] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/toast/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantGuid: guid }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong — try again.')
        setSaving(false)
        return
      }
      router.push('/dashboard?toast_connected=true')
    } catch {
      setError('Network error — try again.')
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2.5rem', maxWidth: 440, width: '100%' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🍞</div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Connect Toast
        </h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
          Toast doesn't have a one-click connect button — instead, paste your Restaurant GUID below.
          You'll find it in your Toast back-office under <strong>Restaurant Info</strong>.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            Toast Restaurant GUID
          </label>
          <input
            type="text"
            value={guid}
            onChange={(e) => setGuid(e.target.value)}
            placeholder="e.g. 8f3c2a10-9b4e-4d77-..."
            required
            style={{
              width: '100%',
              background: 'rgba(21,21,31,0.05)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: 'var(--text-primary)',
              fontSize: '0.9375rem',
              marginBottom: '1rem',
            }}
          />

          {error && (
            <p style={{ color: '#b91c1c', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%',
              background: saving ? 'rgba(124,92,252,0.4)' : 'var(--violet)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              fontSize: '0.9375rem',
              fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            {saving ? 'Connecting…' : 'Connect Toast →'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', fontSize: '0.8125rem' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-secondary)' }}>← Back to dashboard</Link>
        </p>
      </div>
    </div>
  )
}
