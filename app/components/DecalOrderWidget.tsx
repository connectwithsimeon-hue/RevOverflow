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
  const productType = 'table_decal' as const
  const [form, setForm] = useState({
    shippingName: merchantBusinessName || '',
    addressLine1: '', addressLine2: '', city: '', state: '', postCode: '', country: 'US', phone: '', email: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  useEffect(() => {
    fetch('/api/decals')
      .then(r => r.json())
      .then(d => setOrders(d.orders ?? []))
      .finally(() => setLoadingOrders(false))
  }, [])

  // Reset the preview's loading state whenever the product type changes so
  // the spinner shows again while the new design renders.
  useEffect(() => {
    setPreviewLoaded(false)
    setPreviewError(false)
  }, [productType])

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

        <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div style={{
              marginBottom: '1.5rem', padding: '0.875rem 1rem', borderRadius: '10px',
              border: '1px solid var(--border)', backgroundColor: 'var(--ink)',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>Counter card · A5</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Sturdy card that sits by the register — no adhesive. We print and ship <strong>2 cards</strong> to you, free with your plan.
              </div>
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
          </div>

          <div style={{ flex: '0 1 260px', minWidth: '220px' }}>
            <div style={{ position: 'sticky', top: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Live preview</label>
                <button
                  onClick={() => { setPreviewLoaded(false); setPreviewError(false); setPreviewKey(k => k + 1) }}
                  style={{
                    fontSize: '0.75rem', fontWeight: 600, color: 'var(--violet)', background: 'none',
                    border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
                  }}
                  title="Refresh preview (e.g. after uploading a new logo)"
                >
                  Refresh
                </button>
              </div>
              <div style={{
                backgroundColor: '#f7f7fb', border: '1px solid var(--border)', borderRadius: '12px',
                padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '220px', position: 'relative',
              }}>
                {!previewLoaded && !previewError && (
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Rendering preview…</span>
                )}
                {previewError && (
                  <span style={{ fontSize: '0.8125rem', color: '#ef4444', textAlign: 'center' }}>Couldn’t load preview. Try Refresh.</span>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={`${productType}-${previewKey}`}
                  src={`/api/decals/preview?productType=${productType}&t=${previewKey}`}
                  alt={`Preview of your ${PRODUCT_LABEL[productType].toLowerCase()}`}
                  onLoad={() => setPreviewLoaded(true)}
                  onError={() => setPreviewError(true)}
                  style={{
                    maxWidth: '100%', maxHeight: '360px', borderRadius: '6px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    display: previewLoaded ? 'block' : 'none',
                  }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.625rem', lineHeight: 1.5 }}>
                This is the exact design that gets printed and shipped — including your logo and real VIP QR code.
              </p>
            </div>
          </div>
        </div>
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
