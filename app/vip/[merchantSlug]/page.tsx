/**
 * Mode A — VIP Signup Page (data-capture phase)
 * URL: /vip/[merchantSlug]
 *
 * This is the public-facing page a customer sees when they scan the merchant's QR code.
 * They enter their name, email, and phone to join the VIP list.
 * On submit → customer is created in Supabase + SMS double opt-in is initiated.
 */

'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'

export default function VipSignupPage() {
  const params = useParams()
  const slug   = params?.merchantSlug as string

  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [merchant, setMerchant] = useState<{ business_name: string; industry?: string } | null>(null)
  const [loaded, setLoaded]     = useState(false)

  // Load merchant info on first render
  useState(() => {
    fetch(`/api/vip/merchant?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => {
        if (d.merchant) setMerchant(d.merchant)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || (!form.email.trim() && !form.phone.trim())) {
      setError('Please enter your name and at least an email or phone number.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/vip/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      if (form.phone && data.smsPending) {
        setStep('confirm')   // SMS opt-in confirmation required
      } else {
        setStep('done')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const bizName = merchant?.business_name || 'our VIP list'

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F7F7FB 0%, #FFFFFF 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(21,21,31,0.04)',
        border: '1px solid rgba(124,92,252,0.25)',
        borderRadius: '24px', padding: '2.5rem 2rem',
        boxShadow: '0 20px 60px rgba(16,24,40,0.12)',
      }}>

        {/* Yara badge */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '14px',
            background: 'linear-gradient(135deg, #7C5CFC 0%, #a78bfa 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', margin: '0 auto 1rem',
          }}>✦</div>
          <h1 style={{ color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.5rem', margin: '0 0 0.375rem' }}>
            Join the VIP List
          </h1>
          <p style={{ color: 'rgba(21,21,31,0.55)', fontSize: '0.9375rem', margin: 0 }}>
            {loaded && merchant ? `Exclusive deals from ${bizName}` : 'Exclusive deals and early access'}
          </p>
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
                    color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'inherit',
                    outline: 'none',
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
                    color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'inherit',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ color: 'rgba(21,21,31,0.6)', fontSize: '0.8125rem', fontWeight: 500, display: 'block', marginBottom: '0.375rem' }}>
                  Phone number <span style={{ color: 'rgba(21,21,31,0.3)', fontWeight: 400 }}>(for SMS deals)</span>
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
                    color: 'var(--text-primary)', fontSize: '1rem', fontFamily: 'inherit',
                    outline: 'none',
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
                {loading ? 'Joining…' : '✦ Join the VIP list'}
              </button>

              <p style={{ color: 'rgba(21,21,31,0.3)', fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>
                By joining you agree to receive occasional deals from {merchant?.business_name || 'this business'}.
                Reply STOP to cancel SMS anytime.
              </p>
            </div>
          </form>
        )}

        {step === 'confirm' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📱</div>
            <h2 style={{ color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.25rem', marginBottom: '0.75rem' }}>
              One more step
            </h2>
            <p style={{ color: 'rgba(21,21,31,0.6)', lineHeight: 1.7, marginBottom: '0 ' }}>
              We just texted <strong style={{ color: 'var(--text-primary)' }}>{form.phone}</strong>.
              Reply <strong style={{ color: 'var(--violet-dark)' }}>YES</strong> to confirm your spot and start getting VIP deals.
            </p>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.375rem', marginBottom: '0.75rem' }}>
              You're on the VIP list!
            </h2>
            <p style={{ color: 'rgba(21,21,31,0.6)', lineHeight: 1.7 }}>
              Welcome, {form.name.split(' ')[0]}! You'll be the first to hear about exclusive deals
              from {merchant?.business_name || 'us'}. See you soon.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
