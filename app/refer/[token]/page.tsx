/**
 * Referral landing page: /refer/[token]
 *
 * A customer who received this link can sign their friend up for the VIP list.
 * The referring customer is credited in outcome_log.
 *
 * Flow:
 *   1. Validate the token → find merchant (+ referrer if ref_cid provided)
 *   2. Show a signup form (name, email, phone)
 *   3. POST /api/referral/join → creates the referred customer
 *   4. Show confirmation
 *
 * URL: /refer/[token]?slug=<merchantSlug>&ref_cid=<referringCustomerId>
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface Merchant {
  business_name: string
  industry?: string
}

export default function ReferralPage() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const token        = params?.token as string
  const slug         = searchParams?.get('slug') || ''
  const refCid       = searchParams?.get('ref_cid') || ''

  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [loaded, setLoaded]     = useState(false)
  const [step, setStep]         = useState<'form' | 'done'>('form')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({ name: '', email: '', phone: '' })

  useEffect(() => {
    if (!slug) { setLoaded(true); return }
    fetch(`/api/vip/merchant?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => { if (d.merchant) setMerchant(d.merchant) })
      .finally(() => setLoaded(true))
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || (!form.email.trim() && !form.phone.trim())) {
      setError('Please enter your name and at least an email or phone.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/referral/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, slug, refCid, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setStep('done')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const bizName = merchant?.business_name || 'this business'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F7F7FB 0%, #FFFFFF 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(21,21,31,0.04)',
        border: '1px solid rgba(124,92,252,0.25)',
        borderRadius: '24px', padding: '2.5rem 2rem',
        boxShadow: '0 20px 60px rgba(16,24,40,0.12)',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '14px',
            background: 'linear-gradient(135deg, #7C5CFC 0%, #a78bfa 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', margin: '0 auto 1rem',
          }}>
            🎁
          </div>
          {step === 'form' ? (
            <>
              <h1 style={{ color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.5rem', margin: '0 0 0.375rem' }}>
                You were referred!
              </h1>
              <p style={{ color: 'rgba(21,21,31,0.55)', fontSize: '0.9375rem', margin: 0 }}>
                {loaded && merchant
                  ? `A friend thinks you'd love exclusive deals from ${bizName}.`
                  : 'A friend thinks you would love exclusive VIP deals.'}
              </p>
            </>
          ) : (
            <>
              <h1 style={{ color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.5rem', margin: '0 0 0.375rem' }}>
                🎉 Welcome!
              </h1>
              <p style={{ color: 'rgba(21,21,31,0.55)', fontSize: '0.9375rem', margin: 0 }}>
                You're on the VIP list for {bizName}. Look out for exclusive deals soon.
              </p>
            </>
          )}
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ color: 'rgba(21,21,31,0.6)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>
                  Your name *
                </label>
                <input
                  type="text"
                  placeholder="First name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(21,21,31,0.06)', border: '1px solid rgba(21,21,31,0.12)',
                    borderRadius: '10px', padding: '0.75rem 1rem',
                    color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ color: 'rgba(21,21,31,0.6)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(21,21,31,0.06)', border: '1px solid rgba(21,21,31,0.12)',
                    borderRadius: '10px', padding: '0.75rem 1rem',
                    color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ color: 'rgba(21,21,31,0.6)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>
                  Phone <span style={{ color: 'rgba(21,21,31,0.3)', fontWeight: 400 }}>(for SMS deals)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(21,21,31,0.06)', border: '1px solid rgba(21,21,31,0.12)',
                    borderRadius: '10px', padding: '0.75rem 1rem',
                    color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'inherit', outline: 'none',
                  }}
                />
              </div>

              {error && (
                <div style={{ color: '#b91c1c', fontSize: '0.875rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '8px', padding: '0.625rem 0.875rem' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #7C5CFC 0%, #a78bfa 100%)',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '0.875rem', fontSize: '1rem', fontWeight: 700,
                  fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, marginTop: '0.5rem',
                }}
              >
                {loading ? 'Joining…' : '🎁 Join the VIP list'}
              </button>

              <p style={{ color: 'rgba(21,21,31,0.3)', fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>
                By joining you agree to receive occasional deals. Reply STOP to cancel SMS anytime.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
