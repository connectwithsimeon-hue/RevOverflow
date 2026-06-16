import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DashboardSidebar from '@/app/components/DashboardSidebar'

export const dynamic = 'force-dynamic'

const SEGMENT_META: Record<string, { label: string; color: string; bg: string }> = {
  loyal:   { label: 'Loyal',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  active:  { label: 'Active',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  new:     { label: 'New',      color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  at_risk: { label: 'At Risk',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  lapsed:  { label: 'Lapsed',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  lost:    { label: 'Lost',     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const SEGMENTS = ['loyal', 'active', 'new', 'at_risk', 'lapsed', 'lost'] as const

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; segment?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) redirect('/login')

  const page = parseInt(searchParams.page || '1')
  const PAGE_SIZE = 25
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const validSegment = searchParams.segment && (SEGMENTS as readonly string[]).includes(searchParams.segment)
    ? searchParams.segment
    : undefined

  let query = service
    .from('customers')
    .select('id, name, email, phone, segment, rfv_score, last_purchase_at, lifetime_value, total_orders', { count: 'exact' })
    .eq('merchant_id', merchant.id)

  if (validSegment) {
    query = query.eq('segment', validSegment)
  }
  if (searchParams.q) {
    const term = searchParams.q.replace(/[%,]/g, '')
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
  }

  const { data: customers, count: custTotal } = await query
    .order('rfv_score', { ascending: false, nullsFirst: false })
    .range(from, to)

  const totalPages = Math.ceil((custTotal || 0) / PAGE_SIZE)

  // Segment counts for filter chips — full base, unfiltered
  const { data: segmentRows } = await service
    .from('customers')
    .select('segment')
    .eq('merchant_id', merchant.id)

  const segmentCounts: Record<string, number> = {}
  for (const row of segmentRows || []) {
    if (row.segment) segmentCounts[row.segment] = (segmentCounts[row.segment] || 0) + 1
  }
  const totalCustomers = segmentRows?.length || 0

  const initials = (merchant.business_name || 'R')
    .split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')

  const pageQuery = (p: number) => {
    const params = new URLSearchParams()
    params.set('page', String(p))
    if (validSegment) params.set('segment', validSegment)
    if (searchParams.q) params.set('q', searchParams.q)
    return `/customers?${params.toString()}`
  }

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex' }}>
      <DashboardSidebar active="customers" plan={merchant.plan} />

      <main style={{ flex: 1, minWidth: 0 }}>
        {/* ── Topbar ────────────────────────────────────────────────────── */}
        <div style={{
          height: 72, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40,
          backgroundColor: 'rgba(13,13,17,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Customers</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.0625rem' }}>
              {totalCustomers.toLocaleString()} total customers
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/pricing" style={{ fontSize: '0.8125rem', background: 'var(--violet)', color: '#fff', padding: '0.5rem 1.125rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
              Upgrade
            </Link>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #7C5CFC 0%, #a78bfa 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '0.8125rem', color: '#fff',
            }}>
              {initials}
            </div>
          </div>
        </div>

        <div className="max-w-7xl px-8 py-8">

          {/* ── Page header ───────────────────────────────────────────────── */}
          <div className="mb-6">
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              Customers
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              Browse, search, and filter your full customer base.
            </p>
          </div>

          {/* ── Search ────────────────────────────────────────────────────── */}
          <form className="flex items-center gap-3 flex-wrap mb-5" action="/customers" method="get">
            {validSegment && <input type="hidden" name="segment" value={validSegment} />}
            <input
              type="text" name="q" defaultValue={searchParams.q || ''}
              placeholder="Search by name, email, or phone…"
              style={{
                flex: '1 1 280px', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '0.625rem 1rem', fontSize: '0.875rem',
                color: 'var(--text-primary)', fontFamily: 'inherit',
              }}
            />
            <button type="submit" style={btnStyle('violet')}>Search</button>
          </form>

          {/* ── Segment filter chips ──────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <Link href="/customers" style={chipStyle(!validSegment)}>
              All <span style={{ opacity: 0.6 }}>{totalCustomers.toLocaleString()}</span>
            </Link>
            {SEGMENTS.map(seg => {
              const meta = SEGMENT_META[seg]
              const count = segmentCounts[seg] || 0
              const active = validSegment === seg
              return (
                <Link key={seg} href={`/customers?segment=${seg}`} style={chipStyle(active, meta.color)}>
                  {meta.label} <span style={{ opacity: 0.6 }}>{count.toLocaleString()}</span>
                </Link>
              )
            })}
          </div>

          {/* ── Customer table ────────────────────────────────────────────── */}
          {customers && customers.length > 0 ? (
            <div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Customer', 'Segment', 'Score', 'LTV', 'Orders', 'Last visit'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => {
                      const seg = c.segment ? SEGMENT_META[c.segment] : null
                      const lastPurchase = c.last_purchase_at ? relativeDate(c.last_purchase_at) : '—'
                      const custInitials = (c.name || '?').split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('') || '?'
                      return (
                        <tr key={c.id} style={{ borderBottom: i < customers.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 1 ? 'rgba(255,255,255,0.015)' : 'transparent' }}>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                background: seg ? seg.bg : 'rgba(124,92,252,0.12)',
                                color: seg ? seg.color : 'var(--violet)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.6875rem', fontWeight: 700,
                              }}>
                                {custInitials}
                              </div>
                              <div>
                                <Link href={`/customers/${c.id}`} style={{ fontWeight: 600, fontSize: '0.9rem', color: 'inherit', textDecoration: 'none' }}>
                                  {c.name || 'Unknown'}
                                </Link>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '1px' }}>{c.email || c.phone || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {seg
                              ? <span style={{ background: seg.bg, color: seg.color, borderRadius: '100px', padding: '0.2rem 0.625rem', fontSize: '0.75rem', fontWeight: 600 }}>{seg.label}</span>
                              : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            {c.rfv_score != null
                              ? <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--violet)' }}>{c.rfv_score}</span>
                              : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem' }}>${Number(c.lifetime_value ?? 0).toFixed(0)}</td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{c.total_orders ?? 0}</td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{lastPurchase}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    Page {page} of {totalPages} · {custTotal?.toLocaleString()} customers
                  </span>
                  <div className="flex gap-2">
                    {page > 1 && <Link href={pageQuery(page - 1)} style={btnStyle('ghost')}>← Prev</Link>}
                    {page < totalPages && <Link href={pageQuery(page + 1)} style={btnStyle('ghost')}>Next →</Link>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👥</div>
              <p style={{ color: 'var(--text-secondary)' }}>
                {searchParams.q || validSegment ? 'No customers match this filter.' : 'No customers yet — connect your POS to sync your base.'}
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

function btnStyle(variant: 'violet' | 'ghost'): React.CSSProperties {
  if (variant === 'violet') {
    return {
      display: 'inline-block',
      background: 'var(--violet)',
      color: '#fff',
      borderRadius: '10px',
      fontWeight: 700,
      padding: '0.625rem 1.25rem',
      fontSize: '0.9rem',
      textDecoration: 'none',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'inherit',
    }
  }
  return {
    display: 'inline-block',
    background: 'var(--surface)',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    fontWeight: 600,
    padding: '0.625rem 1.25rem',
    fontSize: '0.9rem',
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

function chipStyle(active: boolean, color?: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    background: active ? (color ? `${color}22` : 'rgba(124,92,252,0.15)') : 'var(--surface)',
    border: `1px solid ${active ? (color || 'var(--violet)') : 'var(--border)'}`,
    color: active ? (color || 'var(--violet)') : 'var(--text-secondary)',
    borderRadius: '100px', padding: '0.375rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600,
    textDecoration: 'none',
  }
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
