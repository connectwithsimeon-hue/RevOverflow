'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Supabase puts the session token in the URL hash when the reset link is clicked.
  // The client SDK picks it up automatically on mount.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User arrived via reset link — ready to set new password
      }
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    }
  }

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Link href="/" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.5rem', textDecoration: 'none', color: 'var(--text-primary)' }}>
            Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
          </Link>
        </div>

        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem' }}>

          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.75rem' }}>Password updated!</h1>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                Taking you to your dashboard…
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.5rem' }}>Set a new password</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                Choose a strong password for your RevOverflow account.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    style={{ width: '100%', background: 'rgba(21,21,31,0.05)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9375rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    placeholder="Same password again"
                    style={{ width: '100%', background: 'rgba(21,21,31,0.05)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.9375rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>

                {error && (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{ backgroundColor: loading ? 'rgba(124,92,252,0.5)' : 'var(--violet)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, padding: '0.875rem', fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                >
                  {loading ? 'Saving…' : 'Set new password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
