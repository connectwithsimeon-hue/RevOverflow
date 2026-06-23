'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DecalOrder {
  id: string
  product_type: 'table_decal' | 'glass_print'
  status: string
  tracking_url: string | null
  error_message: string | null
  created_at: string
}

const PRODUCT_LABEL: Record<string, string> = {
  table_decal: 'Counter card',
  glass_print: 'Window sticker',
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Preparing',  color: '#6b7280' },
  submitted: { label: 'In production', color: '#f59e0b' },
  printed:   { label: 'Printed',    color: '#3b82f6' },
  shipped:   { label: 'Shipped',    color: '#3b82f6' },
  delivered: { label: 'Delivered',  color: '#10b981' },
  cancelled: { label: 'Cancelled',  color: '#6b7280' },
  failed:    { label: 'Failed',     color: '#ef4444' },
}

export default function DecalOrderWidget({ merchantBusinessName, eligible }: { merchantBusinessName: string; eligible: boolean }) {
  const [orders, setOrders] = useState<DecalOrder[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [productType, setProductType] = useState<'table_decal' | 'glass_print'>('table_decal')
  const [form, setForm] = useState({
    shippingName: merchantBusinessName || '',
    addressLine1: '', addressLine2: '', city: '', state: '', postCode: '', country: 'US', phone: '', email: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/decals')
      .then(r => r.json())
      .then(d => setOrders(d.orders ?? []))
      .finally(() => setLoadingOrders(false))
  }, [])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function submit() {
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/decals/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType, ...form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Something went wrong submitting the order.' })
      } else {
        setMessage({ type: 'ok', text: 'Order submitted! We’ll email tracking info once it ships.' })
        fetch('/api/decals').then(r => r.json()).then(d => setOrders(d.orders ?? []))
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error — please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.875rem', borderRadius: '8px',
    border: '1px solid var(--border)', backgroundColor: 'var(--ink)',
    color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = { fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.375rem', display: 'block' }

  if (!eligible) {
    return (
      <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
          In-store decals are included free with any paid RevOverflow plan. Upgrade to order yours.
        </p>
        <Link href="/pricing" style={{ display: 'inline-block', backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.75rem 1.25rem', fontSize: '0.9375rem', textDecoration: 'none' }}>
          See plans →
        </Link>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>
          Order a print
        </h2>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {(['table_decal', 'glass_print'] as const).map(type => (
            <button
              key={type}
              onClick={() => setProductType(type)}
              style={{
                flex: 1, padding: '0.875rem 1rem', borderRadius: '10px', cursor: 'pointer',
                border: productType === type ? '2px solid var(--violet)' : '1px solid var(--border)',
                backgroundColor: productType === type ? 'rgba(124,92,252,0.08)' : 'var(--ink)',
                fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>{PRODUCT_LABEL[type]}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {type === 'table_decal' ? 'Paper card, just sits at the counter, 4×6 in' : 'Adhesive sticker for windows/doors, 8×10 in'}
              </div>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Recipient name</label>
            <input style={inputStyle} value={form.shippingName} onChange={e => update('shippingName', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={form.email} onChange={e => update('email', e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Address line 1</label>
          <input style={inputStyle} value={form.addressLine1} onChange={e => update('addressLine1', e.target.value)} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Address line 2 (optional)</label>
          <input style={inputStyle} value={form.addressLine2} onChange={e => update('addressLine2', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>City</label>
            <input style={inputStyle} value={form.city} onChange={e => update('city', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>State</label>
            <input style={inputStyle} value={form.state} onChange={e => update('state', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>ZIP / Postal code</label>
            <input style={inputStyle} value={form.postCode} onChange={e => update('postCode', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={labelStyle}>Country (2-letter code)</label>
            <input style={inputStyle} value={form.country} onChange={e => update('country', e.target.value.toUpperCase())} maxLength={2} />
          </div>
          <div>
            <label style={labelStyle}>Phone (optional)</label>
            <input style={inputStyle} value={form.phone} onChange={e => update('phone', e.target.value)} />
          </div>
        </div>

        {message && (
          <div style={{
            marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem',
            backgroundColor: message.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: message.type === 'ok' ? '#10b981' : '#ef4444',
            border: `1px solid ${message.type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            {message.text}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          style={{
            backgroundColor: 'var(--violet)', color: '#fff', border: 'none', borderRadius: '10px',
            fontWeight: 700, padding: '0.75rem 1.5rem', fontSize: '0.9375rem', cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.6 : 1, fontFamily: 'inherit',
          }}
        >
          {submitting ? 'Submitting…' : 'Order free print'}
        </button>
      </section>

      <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
          Your orders
        </h2>
        {loadingOrders ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading…</p>
        ) : orders.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No decal orders yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {orders.map(o => {
              const status = STATUS_LABEL[o.status] || STATUS_LABEL.pending
              return (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{PRODUCT_LABEL[o.product_type]}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {o.error_message && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>{o.error_message}</div>}
                  </div>
                  <span style={{ color: status.color, fontWeight: 700, fontSize: '0.8125rem' }}>{status.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
