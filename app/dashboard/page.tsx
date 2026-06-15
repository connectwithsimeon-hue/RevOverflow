import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'

const SEGMENT_META: Record<string, { label: string; color: string; bg: string; description: string }> = {
  loyal:   { label: 'Loyal',    color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  description: 'High-value regulars' },
  active:  { label: 'Active',   color: '#4ade80', bg: 'rgba(74,222,128,0.1)',   description: 'Buying consistently' },
  new:     { label: 'New',      color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',   description: 'First purchase' },
  at_risk: { label: 'At Risk',  color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   description: 'Starting to drift' },
  lapsed:  { label: 'Lapsed',   color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   description: 'Haven\'t bought in 4+ months' },
  lost:    { label: 'Lost',     color: '#f87171', bg: 'rgba(248,113,113,0.1)',  description: 'Gone over a year' },
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { square_connected?: string; square_error?: string; page?: string; syncing?: string; billing?: string; credits?: string }
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

  const isConnected = !!merchant.square_merchant_id
  const syncStatus = merchant.sync_status as string
  const syncProgress = merchant.sync_progress as number

  // Counts
  const { count: customerCount } = await service
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)

  const { count: orderCount } = await service
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)

  // Segment breakdown
  const { data: segmentRows } = await service
    .from('customers')
    .select('segment')
    .eq('merchant_id', merchant.id)
    .not('segment', 'is', null)

  const segmentCounts: Record<string, number> = {}
  for (const row of segmentRows || []) {
    if (row.segment) segmentCounts[row.segment] = (segmentCounts[row.segment] || 0) + 1
  }

  // Customer list (paginated, 20 per page)
  const page = parseInt(searchParams.page || '1')
  const PAGE_SIZE = 20
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: customers, count: totalCustomers } = await service
    .from('customers')
    .select('id, name, email, phone, segment, rfv_score, last_purchase_at, lifetime_value, total_orders', { count: 'exact' })
    .eq('merchant_id', merchant.id)
    .order('rfv_score', { ascending: false, nullsFirst: false })
    .range(from, to)

  const totalPages = Math.ceil((totalCustomers || 0) / PAGE_SIZE)
  const hasScores = (segmentRows?.length || 0) > 0

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.125rem' }}>
            Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
          </span>
          <div className="flex items-center gap-4">
            <Link href="/pricing" style={{ fontSize: '0.875rem', color: 'var(--violet)', fontWeight: 600, textDecoration: 'none' }}>Upgrade</Link>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{merchant.business_name}</span>
            <form action={logout}>
              <button type="submit" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Log out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Banners */}
        {searchParams.billing === 'success' && (
          <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '2rem', color: '#4ade80', fontSize: '0.9375rem' }}>
            🎉 Welcome to RevOverflow! Your subscription is active. Yara is ready to work.
          </div>
        )}
        {searchParams.credits === 'purchased' && (
          <div style={{ backgroundColor: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.35)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '2rem', color: 'var(--violet)', fontSize: '0.9375rem' }}>
            ✦ Credits added! Your new balance is {(merchant.credit_balance ?? 0).toLocaleString()} Yara credits.
          </div>
        )}
        {searchParams.syncing && (
          <div style={{ backgroundColor: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.35)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '2rem', color: 'var(--violet-light, #a78bfa)', fontSize: '0.9375rem' }}>
            ↻ Syncing Square data — this takes about 30 seconds. Refresh the page to see your customers.
          </div>
        )}
        {searchParams.square_connected && (
          <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '2rem', color: '#4ade80', fontSize: '0.9375rem' }}>
            ✓ Square connected! Syncing your customers and orders — check back in a moment.
          </div>
        )}
        {searchParams.square_error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '2rem', color: '#f87171', fontSize: '0.9375rem' }}>
            Square connection failed ({searchParams.square_error}). <a href="/api/square/connect" style={{ color: 'var(--violet-light)' }}>Try again</a>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.375rem' }}>
            {merchant.business_name}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            {isConnected
              ? syncStatus === 'complete'
                ? hasScores ? 'Yara has scored your customers. Win-back triggers coming in the next sprint.' : 'Sync complete — scoring customers now.'
                : 'Syncing your Square data…'
              : 'Connect your Square account to get started.'}
          </p>
        </div>

        {/* Top stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total customers', value: customerCount?.toLocaleString() ?? '—', sub: null },
            { label: 'Total orders',    value: orderCount?.toLocaleString() ?? '—',    sub: null },
            { label: 'Square',          value: isConnected ? 'Connected' : 'Not connected', sub: null },
            { label: 'Sync',            value: syncStatus === 'complete' ? '✓ Done' : syncStatus === 'in_progress' ? `${syncProgress}%` : syncStatus.replace('_', ' '), sub: null },
            { label: 'Yara Credits',    value: (merchant.credit_balance ?? 0).toLocaleString(), sub: merchant.plan ? `${merchant.plan} plan` : null, isCredits: true },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: 'var(--surface)', border: (card as any).isCredits ? '1px solid rgba(124,92,252,0.4)' : '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.375rem' }}>{card.label}</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: (card as any).isCredits ? 'var(--violet)' : 'inherit' }}>{card.value}</div>
              {card.sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{card.sub}</div>}
              {(card as any).isCredits && (
                <Link href="/pricing" style={{ fontSize: '0.7rem', color: 'var(--violet)', textDecoration: 'none', fontWeight: 600 }}>Buy more →</Link>
              )}
            </div>
          ))}
        </div>

        {/* Re-sync + Yara Autopilot row */}
        {isConnected && syncStatus !== 'in_progress' && (
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <a
              href="/api/square/sync-trigger"
              style={{ display: 'inline-block', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '0.625rem 1.25rem', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}
            >
              ↻ Re-sync Square data
            </a>

            {/* Yara Autopilot toggle — Brain/Empire only */}
            {['brain', 'empire'].includes(merchant.plan || '') ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: merchant.auto_campaigns_enabled ? 'rgba(124,92,252,0.1)' : 'var(--surface)', border: merchant.auto_campaigns_enabled ? '1px solid rgba(124,92,252,0.4)' : '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem' }}>
                <span style={{ fontSize: '0.875rem', color: merchant.auto_campaigns_enabled ? 'var(--violet)' : 'var(--text-secondary)', fontWeight: 500 }}>
                  ✦ Yara Autopilot {merchant.auto_campaigns_enabled ? 'ON' : 'OFF'}
                </span>
                <form action={async () => {
                  'use server'
                  const { createServiceClient: sc } = await import('@/lib/supabase/server')
                  const s = sc()
                  await s.from('merchants').update({ auto_campaigns_enabled: !merchant.auto_campaigns_enabled, updated_at: new Date().toISOString() }).eq('id', merchant.id)
                  const { redirect: r } = await import('next/navigation')
                  r('/dashboard')
                }}>
                  <button type="submit" style={{ backgroundColor: merchant.auto_campaigns_enabled ? 'var(--violet)' : 'transparent', color: merchant.auto_campaigns_enabled ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {merchant.auto_campaigns_enabled ? 'Turn off' : 'Turn on'}
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
                ✦ Unlock Yara Autopilot <span style={{ color: 'var(--violet)', fontWeight: 600 }}>→ Brain plan</span>
              </Link>
            )}
          </div>
        )}

        {/* Connect Square panel (if not connected) */}
        {!isConnected && (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '20px', padding: '2.5rem', textAlign: 'center', maxWidth: '500px', marginBottom: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔗</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>Connect your Square account</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
              One click — we&apos;ll read your customers and orders, score everyone, and show you who to win back.
            </p>
            <a href="/api/square/connect" style={{ display: 'inline-block', backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.875rem 2rem', fontSize: '1rem', textDecoration: 'none' }}>
              Connect Square
            </a>
          </div>
        )}

        {/* Win-back CTA */}
        {hasScores && ((segmentCounts['at_risk'] || 0) + (segmentCounts['lapsed'] || 0)) > 0 && (
          <div style={{ backgroundColor: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, marginBottom: '0.25rem' }}>
                {(segmentCounts['at_risk'] || 0) + (segmentCounts['lapsed'] || 0)} customers are drifting away
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Yara can send them a personalised win-back email today.
              </div>
            </div>
            <Link href="/campaigns" style={{ display: 'inline-block', backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.75rem 1.5rem', fontSize: '0.9375rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Launch win-back →
            </Link>
          </div>
        )}

        {/* Segment breakdown */}
        {hasScores && (
          <div className="mb-8">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>
              Customer Segments
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(['loyal', 'active', 'new', 'at_risk', 'lapsed', 'lost'] as const).map(seg => {
                const meta = SEGMENT_META[seg]
                const count = segmentCounts[seg] || 0
                const pct = customerCount ? Math.round((count / customerCount) * 100) : 0
                return (
                  <div key={seg} style={{ backgroundColor: 'var(--surface)', border: `1px solid ${meta.color}30`, borderRadius: '12px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: meta.color, flexShrink: 0 }} />
                      <span style={{ color: meta.color, fontSize: '0.75rem', fontWeight: 600 }}>{meta.label}</span>
                    </div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{count.toLocaleString()}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>{pct}% · {meta.description}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Customer list */}
        {(customers && customers.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700 }}>
                Customers {hasScores ? '· ranked by Customer Score' : ''}
              </h2>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {totalCustomers?.toLocaleString()} total
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Customer', 'Segment', 'Customer Score', 'Last Purchase', 'Orders', 'LTV'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => {
                    const seg = c.segment ? SEGMENT_META[c.segment] : null
                    const lastPurchase = c.last_purchase_at
                      ? new Date(c.last_purchase_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'
                    return (
                      <tr key={c.id} style={{ borderBottom: i < customers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{c.name || 'Unknown'}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{c.email || c.phone || '—'}</div>
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          {seg ? (
                            <span style={{ backgroundColor: seg.bg, color: seg.color, borderRadius: '100px', padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {seg.label}
                            </span>
                          ) : <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.875rem 1rem' }}>
                          {c.rfv_score != null ? (
                            <div className="flex items-center gap-2">
                              <div style={{ width: 48, height: 6, backgroundColor: 'var(--ink-muted)', borderRadius: 3 }}>
                                <div style={{ width: `${c.rfv_score}%`, height: 6, backgroundColor: 'var(--violet)', borderRadius: 3 }} />
                              </div>
                              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{c.rfv_score}</span>
                            </div>
                          ) : <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{lastPurchase}</td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem' }}>{c.total_orders}</td>
                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
                          ${Number(c.lifetime_value).toFixed(0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link href={`/dashboard?page=${page - 1}`} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none', color: 'var(--text-primary)' }}>
                      ← Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link href={`/dashboard?page=${page + 1}`} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none', color: 'var(--text-primary)' }}>
                      Next →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sync in progress notice */}
        {syncStatus === 'in_progress' && (
          <div style={{ marginTop: '2rem', padding: '1.25rem', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#fbbf24' }} />
              <span style={{ fontWeight: 600 }}>Syncing Square data… {syncProgress}%</span>
            </div>
            <div style={{ backgroundColor: 'var(--ink-muted)', borderRadius: '100px', height: 6 }}>
              <div style={{ backgroundColor: 'var(--violet)', borderRadius: '100px', height: 6, width: `${syncProgress}%`, transition: 'width 0.5s ease' }} />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Refresh in a minute to see your customers.</p>
          </div>
        )}

      </div>
    </div>
  )
}
