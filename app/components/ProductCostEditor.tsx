/**
 * ProductCostEditor — client component
 *
 * Lists the merchant's products (from synced POS line items) and lets them
 * enter a cost per product. Saving powers the Profit + Inventory agents
 * (margin-aware promotions). Margin = (avg price - cost) / avg price.
 */
'use client'

import { useEffect, useState } from 'react'

interface Product {
  catalogName: string
  category: string | null
  unitsSold: number
  revenue: number
  avgPrice: number
  unitCost: number | null
  marginPct: number | null
}

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

function marginColor(pct: number | null): string {
  if (pct === null) return 'var(--text-secondary)'
  if (pct >= 60) return '#15803d'
  if (pct <= 25) return '#c2410c'
  return '#92400e'
}

export default function ProductCostEditor() {
  const [products, setProducts] = useState<Product[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        if (d.products) {
          setProducts(d.products)
          const init: Record<string, string> = {}
          for (const p of d.products as Product[]) if (p.unitCost !== null) init[p.catalogName] = String(p.unitCost)
          setEdits(init)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function setCost(name: string, value: string) {
    setEdits((e) => ({ ...e, [name]: value }))
  }

  function liveMargin(p: Product): number | null {
    const raw = edits[p.catalogName]
    if (raw === undefined || raw === '') return p.marginPct
    const cost = parseFloat(raw)
    if (!Number.isFinite(cost) || p.avgPrice <= 0) return null
    return Math.round(((p.avgPrice - cost) / p.avgPrice) * 100)
  }

  async function save() {
    setSaving(true)
    const costs = Object.entries(edits)
      .filter(([, v]) => v !== '' && Number.isFinite(parseFloat(v)))
      .map(([catalogName, v]) => ({ catalogName, unitCost: parseFloat(v) }))
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costs }),
      })
      const d = await res.json()
      if (d.products) setProducts(d.products)
      setSavedAt(Date.now())
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading your products…</div>

  if (products.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        No itemized product sales synced yet. Once your POS syncs line items, your products will appear here to add costs.
      </div>
    )
  }

  const withCost = products.filter((p) => p.marginPct !== null).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {withCost} of {products.length} products have a cost. {withCost < products.length ? 'Add the rest so Yara can protect every margin.' : 'All set — Yara is fully margin-aware.'}
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{ background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.625rem 1.5rem', fontWeight: 700, fontSize: '0.875rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}
        >
          {saving ? 'Saving…' : savedAt ? 'Saved ✓' : 'Save costs'}
        </button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Product', 'Units sold', 'Avg price', 'Your cost', 'Margin'].map((h) => (
                  <th key={h} style={{ textAlign: h === 'Product' ? 'left' : 'right', padding: '0.75rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => {
                const m = liveMargin(p)
                return (
                  <tr key={p.catalogName} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>
                      {p.catalogName}
                      {p.category && <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 400 }}>{p.category}</div>}
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{p.unitsSold.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>{money(p.avgPrice)}</td>
                    <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={edits[p.catalogName] ?? ''}
                        onChange={(e) => setCost(p.catalogName, e.target.value)}
                        placeholder="—"
                        style={{ width: 80, textAlign: 'right', border: '1px solid var(--border)', borderRadius: 8, padding: '0.375rem 0.5rem', fontSize: '0.875rem', marginLeft: 4, fontFamily: 'inherit' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', fontWeight: 800, color: marginColor(m) }}>
                      {m === null ? '—' : `${m}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
