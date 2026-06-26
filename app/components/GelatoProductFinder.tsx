'use client'

import { useEffect, useState } from 'react'

interface Catalog { uid: string; title: string }

export default function GelatoProductFinder() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [catalogs, setCatalogs] = useState<Catalog[]>([])
  const [activeCatalog, setActiveCatalog] = useState<string | null>(null)
  const [products, setProducts] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/gelato/catalog')
        const data = await res.json()
        if (data.configured === false) { setConfigured(false); return }
        setConfigured(true)
        if (data.error) setError(data.error)
        setCatalogs(data.catalogs || [])
      } catch {
        setError('Could not reach the server.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function loadCatalog(uid: string) {
    setActiveCatalog(uid)
    setProducts([])
    setError(null)
    setFilter('')
    setLoading(true)
    try {
      const res = await fetch(`/api/gelato/catalog?catalog=${encodeURIComponent(uid)}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      setProducts(data.products || [])
    } catch {
      setError('Could not load products.')
    } finally {
      setLoading(false)
    }
  }

  function copy(uid: string) {
    navigator.clipboard.writeText(uid)
    setCopied(uid)
    setTimeout(() => setCopied(null), 1500)
  }

  if (configured === false) {
    return (
      <div style={box}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>Gelato isn&apos;t connected yet</h2>
        <p style={{ margin: 0, color: '#6b7280', lineHeight: 1.6 }}>
          Add your <code style={code}>GELATO_API_KEY</code> in Vercel (Settings → Environment
          Variables), redeploy, then refresh this page. Once it&apos;s set, you&apos;ll see your
          product categories here with copy buttons.
        </p>
      </div>
    )
  }

  const shown = filter.trim()
    ? products.filter((p) => p.toLowerCase().includes(filter.toLowerCase()))
    : products

  return (
    <div>
      <div style={box}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>1 · Pick a category</h2>
        <p style={{ margin: '0 0 14px', color: '#6b7280', fontSize: 14 }}>
          For your <b>counter card</b>, look in <b>Cards</b>, <b>Flyers</b>, or <b>Posters</b>.
          For your <b>window sticker</b>, look in <b>Stickers</b>.
        </p>
        {loading && !activeCatalog && <p style={{ color: '#6b7280' }}>Loading…</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {catalogs.map((c) => (
            <button
              key={c.uid}
              onClick={() => loadCatalog(c.uid)}
              style={{
                ...chip,
                background: activeCatalog === c.uid ? '#6d28d9' : '#fff',
                color: activeCatalog === c.uid ? '#fff' : '#1a1b2e',
                borderColor: activeCatalog === c.uid ? '#6d28d9' : '#e5e7eb',
              }}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      {activeCatalog && (
        <div style={box}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>2 · Copy the product ID</h2>
          <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: 14 }}>
            The ID spells out the size — e.g. one with <code style={code}>a5</code> is A5.
            Copy the A5 card ID into <code style={code}>GELATO_TABLE_DECAL_PRODUCT_UID</code>, and
            your sticker ID into <code style={code}>GELATO_GLASS_PRINT_PRODUCT_UID</code>.
          </p>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter — try typing  a5  or  4x6"
            style={input}
          />
          {loading && <p style={{ color: '#6b7280' }}>Loading products…</p>}
          {!loading && shown.length === 0 && !error && (
            <p style={{ color: '#6b7280' }}>No products found in this category.</p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {shown.map((uid) => (
              <div key={uid} style={row}>
                <code style={{ fontSize: 13, wordBreak: 'break-all', flex: 1 }}>{uid}</code>
                <button onClick={() => copy(uid)} style={copyBtn}>
                  {copied === uid ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ ...box, borderColor: '#fca5a5', background: '#fef2f2' }}>
          <b style={{ color: '#b91c1c' }}>Gelato said:</b>{' '}
          <span style={{ color: '#7f1d1d' }}>{error}</span>
          <p style={{ margin: '8px 0 0', color: '#7f1d1d', fontSize: 13 }}>
            If this mentions the key, double-check <code style={code}>GELATO_API_KEY</code> in Vercel.
          </p>
        </div>
      )}
    </div>
  )
}

const box: React.CSSProperties = {
  background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
  padding: 20, marginBottom: 16,
}
const chip: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 999, border: '1px solid #e5e7eb',
  fontSize: 14, fontWeight: 600, cursor: 'pointer',
}
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
  background: '#f9fafb', border: '1px solid #eef0f3', borderRadius: 10,
}
const copyBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, border: 'none', background: '#6d28d9',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
}
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb',
  fontSize: 14, boxSizing: 'border-box',
}
const code: React.CSSProperties = {
  background: '#f3f4f6', padding: '1px 6px', borderRadius: 5, fontSize: 13,
}
