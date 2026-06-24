/**
 * MembershipEditor — client component
 *
 * Lets a merchant define their membership offer (name, price, perks) and paste
 * their OWN signup/checkout link. RevOverflow promotes and tracks it; it never
 * processes the payment. Recurring revenue = current members × monthly price.
 */
'use client'

import { useEffect, useState } from 'react'

interface Membership {
  name: string
  monthly_price: number
  perks: string | null
  signup_url: string | null
  current_members: number
  active: boolean
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem' }
const inputStyle: React.CSSProperties = { width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '0.625rem 0.75rem', fontSize: '0.9375rem', fontFamily: 'inherit', background: 'var(--surface)' }

export default function MembershipEditor() {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [perks, setPerks] = useState('')
  const [signupUrl, setSignupUrl] = useState('')
  const [members, setMembers] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/membership')
      .then((r) => r.json())
      .then((d) => {
        const m: Membership | null = d.membership
        if (m) {
          setName(m.name ?? '')
          setPrice(m.monthly_price ? String(m.monthly_price) : '')
          setPerks(m.perks ?? '')
          setSignupUrl(m.signup_url ?? '')
          setMembers(m.current_members ? String(m.current_members) : '')
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          monthlyPrice: parseFloat(price) || 0,
          perks,
          signupUrl,
          currentMembers: parseInt(members) || 0,
          active: true,
        }),
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

  const recurring = (parseInt(members) || 0) * (parseFloat(price) || 0)

  return (
    <div style={{ maxWidth: 620 }}>
      {/* No-payments reassurance */}
      <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 12, padding: '0.875rem 1rem', marginBottom: '1.5rem', fontSize: '0.8125rem', color: '#15803d' }}>
        RevOverflow promotes your membership and tracks it — but you keep collecting payment through your own system (your Square link below). We never touch your money.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={labelStyle}>Membership name</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Wash Club, VIP Members, Coffee Club" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Monthly price</label>
            <input style={inputStyle} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="39" />
          </div>
          <div>
            <label style={labelStyle}>Current members (you maintain this)</label>
            <input style={inputStyle} type="number" min="0" value={members} onChange={(e) => setMembers(e.target.value)} placeholder="0" />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Perks (one per line)</label>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }} value={perks} onChange={(e) => setPerks(e.target.value)} placeholder={'Unlimited washes\n10% off add-ons\nSkip the line'} />
        </div>

        <div>
          <label style={labelStyle}>Your signup / checkout link</label>
          <input style={inputStyle} value={signupUrl} onChange={(e) => setSignupUrl(e.target.value)} placeholder="https://… your Square subscription or membership signup page" />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
            Don&apos;t have one yet? Most merchants set this up in <strong>Square → Subscriptions</strong>, then paste the link here. Yara will send customers straight to it.
          </p>
        </div>

        {recurring > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current recurring revenue</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>{money(recurring)}<span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/mo</span></div>
          </div>
        )}

        <button
          onClick={save}
          disabled={saving || !name}
          style={{ alignSelf: 'flex-start', background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem 1.75rem', fontWeight: 700, fontSize: '0.9375rem', cursor: saving || !name ? 'default' : 'pointer', opacity: saving || !name ? 0.6 : 1, fontFamily: 'inherit' }}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save membership'}
        </button>
      </div>
    </div>
  )
}
