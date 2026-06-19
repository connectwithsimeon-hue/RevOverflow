'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
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

          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.75rem' }}>Check your email</h1>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                We sent a password reset link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>. Click the link in the email to set a new password.
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Didn't get it? Check your spam folder, or{' '}
                <button onClick={() => setSent(false)} style={{ color: 'var(--violet)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', padding: 0 }}>
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.5rem' }}>Reset your password</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                Enter your email and we'll send you a link to get back in.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@yourbusiness.com"
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
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Remember it?{' '}
          <Link href="/login" style={{ color: 'var(--violet)', textDecoration: 'none', fontWeight: 600 }}>Back to login</Link>
        </p>
      </div>
    </div>
  )
}
