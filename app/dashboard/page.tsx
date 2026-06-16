import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'
import OnboardingBanner from '@/app/components/OnboardingBanner'
import ReachableBaseMeter from '@/app/components/ReachableBaseMeter'
import GuaranteeBanner from '@/app/components/GuaranteeBanner'
import { computeGuaranteeStatus } from '@/lib/guarantee'
import YaraRecommendations from '@/app/components/YaraRecommendations'
import TrustScoreWidget from '@/app/components/TrustScoreWidget'
import GoalModeWidget from '@/app/components/GoalModeWidget'

export const dynamic = 'force-dynamic'

const SEGMENT_META: Record<string, { label: string; color: string; bg: string }> = {
  loyal:   { label: 'Loyal',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  active:  { label: 'Active',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)'  },
  new:     { label: 'New',      color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  at_risk: { label: 'At Risk',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  lapsed:  { label: 'Lapsed',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  lost:    { label: 'Lost',     color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: {
    square_connected?: string
    square_error?: string
    clover_connected?: string
    clover_error?: string
    page?: string
    billing?: string
    credits?: string
    syncing?: string
  }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('*, vip_slug')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) redirect('/login')

  const posProvider: 'square' | 'clover' | null = merchant.square_merchant_id
    ? 'square'
    : merchant.clover_merchant_id
      ? 'clover'
      : null
  const isConnected = posProvider !== null
  const syncStatus  = merchant.sync_status as string
  const syncProgress = merchant.sync_progress as number

  // ── Revenue recovered (attributed from campaigns) ─────────────────────────
  const { data: revenueRows } = await service
    .from('orders')
    .select('total_amount, ordered_at')
    .eq('merchant_id', merchant.id)
    .gte('ordered_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

  // Revenue this month vs last month
  const nowDate = new Date()
  const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1).toISOString()

  const { data: thisMonthRevRows } = await service
    .from('orders')
    .select('total_amount')
    .eq('merchant_id', merchant.id)
    .gte('ordered_at', startOfMonth)

  const { data: lastMonthRevRows } = await service
    .from('orders')
    .select('total_amount')
    .eq('merchant_id', merchant.id)
    .gte('ordered_at', startOfLastMonth)
    .lt('ordered_at', startOfMonth)

  const thisMonthRev = (thisMonthRevRows ?? []).reduce((sum, r) => sum + parseFloat(r.total_amount ?? '0'), 0)
  const lastMonthRev = (lastMonthRevRows ?? []).reduce((sum, r) => sum + parseFloat(r.total_amount ?? '0'), 0)
  const revChange = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev * 100) : 0

  // ── Segment counts ────────────────────────────────────────────────────────
  const { data: segmentRows } = await service
    .from('customers')
    .select('segment')
    .eq('merchant_id', merchant.id)
    .not('segment', 'is', null)

  const segmentCounts: Record<string, number> = {}
  for (const row of segmentRows || []) {
    if (row.segment) segmentCounts[row.segment] = (segmentCounts[row.segment] || 0) + 1
  }

  const totalCustomers = Object.values(segmentCounts).reduce((a, b) => a + b, 0)
  const atRisk = (segmentCounts['at_risk'] || 0) + (segmentCounts['lapsed'] || 0)
  const reachable = (segmentCounts['loyal'] || 0) + (segmentCounts['active'] || 0) +
    (segmentCounts['new'] || 0) + (segmentCounts['at_risk'] || 0) + (segmentCounts['lapsed'] || 0)

  // Mode A = 1000+ reachable customers
  const mode = reachable >= 1000 ? 'A' : 'B'
  const modeA = mode === 'A'

  // VIP setup = merchant has a vip_slug set
  const hasVipSetup = !!merchant.vip_slug

  // Guarantee status (runs fast — only reads outcome_log)
  const guarantee = await computeGuaranteeStatus(merchant.id)

  const hasScores = (segmentRows?.length || 0) > 0

  // ── Campaigns stats ───────────────────────────────────────────────────────
  const { data: campaigns } = await service
    .from('campaigns')
    .select('id, name, status, total_sent, sent_at, trigger_type')
    .eq('merchant_id', merchant.id)
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(5)

  const totalCampaignsSent = campaigns?.length ?? 0

  // ── Yara Activity Feed (last 10 sends) ───────────────────────────────────
  const { data: recentSends } = await service
    .from('campaign_sends')
    .select('id, sent_at, email, campaign_id, customer_id, customers(name, segment)')
    .eq('merchant_id', merchant.id)
    .eq('is_control_group', false)
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(8)

  // ── Customer list ─────────────────────────────────────────────────────────
  const page = parseInt(searchParams.page || '1')
  const PAGE_SIZE = 15
  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  const { data: customers, count: custTotal } = await service
    .from('customers')
    .select('id, name, email, phone, segment, rfv_score, last_purchase_at, lifetime_value, total_orders', { count: 'exact' })
    .eq('merchant_id', merchant.id)
    .order('rfv_score', { ascending: false, nullsFirst: false })
    .range(from, to)

  const totalPages = Math.ceil((custTotal || 0) / PAGE_SIZE)

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link href="/dashboard" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.125rem', textDecoration: 'none', color: 'inherit' }}>
            Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/campaigns" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Campaigns</Link>
            <Link href="/customers" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Customers</Link>
            <Link href="/account" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Account</Link>
            <Link href="/pricing" style={{ fontSize: '0.8125rem', background: 'var(--violet)', color: '#fff', padding: '0.4rem 1rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>
              Upgrade
            </Link>
            <form action={logout}>
              <button type="submit" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Flash banners ─────────────────────────────────────────────── */}
        {searchParams.billing === 'success' && (
          <Banner color="green" icon="🎉">Welcome to RevOverflow! Your subscription is active. Yara is ready to work.</Banner>
        )}
        {searchParams.credits === 'purchased' && (
          <Banner color="violet" icon="✦">Credits added! New balance: {(merchant.credit_balance ?? 0).toLocaleString()} Yara credits.</Banner>
        )}
        {searchParams.square_connected && (
          <Banner color="green" icon="✓">Square connected — syncing your customers and orders now.</Banner>
        )}
        {searchParams.square_error && (
          <Banner color="red" icon="✕">Square error: {searchParams.square_error}. <a href="/api/square/connect" style={{ color: '#60a5fa' }}>Try again</a></Banner>
        )}
        {searchParams.clover_connected && (
          <Banner color="green" icon="✓">Clover connected — syncing your customers and orders now.</Banner>
        )}
        {searchParams.clover_error && (
          <Banner color="red" icon="✕">Clover error: {searchParams.clover_error}. <a href="/api/clover/connect" style={{ color: '#60a5fa' }}>Try again</a></Banner>
        )}
        {searchParams.syncing && (
          <Banner color="violet" icon="↻">Syncing your data — refresh in about 30 seconds.</Banner>
        )}

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800 }}>
                {merchant.business_name}
              </h1>
              {/* Mode badge */}
              {hasScores && (
                <span style={{
                  background: mode === 'A' ? 'rgba(124,92,252,0.15)' : 'rgba(251,191,36,0.15)',
                  color:      mode === 'A' ? 'var(--violet)'          : '#fbbf24',
                  border:     `1px solid ${mode === 'A' ? 'rgba(124,92,252,0.4)' : 'rgba(251,191,36,0.4)'}`,
                  borderRadius: '100px',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  Mode {mode} {mode === 'A' ? '· Revenue Activation' : '· Data Capture'}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              {!isConnected
                ? 'Connect your POS to get started.'
                : syncStatus !== 'complete'
                  ? 'Syncing your data…'
                  : `${totalCustomers.toLocaleString()} customers · ${atRisk > 0 ? `${atRisk} need attention` : 'all segments healthy'}`}
            </p>
          </div>

          {/* Quick action buttons */}
          <div className="flex gap-3 flex-wrap">
            {isConnected && syncStatus !== 'in_progress' && (
              <a href={posProvider === 'clover' ? '/api/clover/sync-trigger' : '/api/square/sync-trigger'} style={btnStyle('ghost')}>↻ Sync</a>
            )}
            {hasScores && atRisk > 0 && (
              <Link href="/campaigns" style={btnStyle('violet')}>✦ Launch Campaign</Link>
            )}
            {!isConnected && (
              <>
                <a href="/api/square/connect" style={btnStyle('violet')}>Connect Square →</a>
                <a href="/api/clover/connect" style={btnStyle('ghost')}>Connect Clover →</a>
              </>
            )}
          </div>
        </div>

        {/* ── Guarantee banner ──────────────────────────────────────────── */}
        {guarantee?.eligible && (
          <GuaranteeBanner {...guarantee} />
        )}

        {/* ── Mode meter + Onboarding guide ────────────────────────────── */}
        <ReachableBaseMeter reachable={reachable} total={totalCustomers} modeA={modeA} />
        <OnboardingBanner
          isConnected={isConnected}
          hasSynced={hasScores}
          hasCampaign={totalCampaignsSent > 0}
          modeA={modeA}
          hasVipSetup={hasVipSetup}
          reachable={reachable}
        />

        {/* ── Goal Mode — autonomous execution toward revenue target ─────── */}
        {isConnected && hasScores && <GoalModeWidget />}

        {/* ── Yara Trust Score (collapses to a header — expands on click) ── */}
        {isConnected && hasScores && <TrustScoreWidget />}

        {/* ── Key metrics row ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Revenue This Month"
            value={`$${thisMonthRev.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            sub={lastMonthRev > 0 ? `${revChange >= 0 ? '+' : ''}${revChange.toFixed(0)}% vs last month` : undefined}
            subColor={revChange >= 0 ? '#4ade80' : '#f87171'}
            highlight
          />
          <StatCard
            label="Total Customers"
            value={totalCustomers.toLocaleString()}
            sub={`${reachable.toLocaleString()} reachable`}
          />
          <StatCard
            label="Need Win-back"
            value={atRisk.toLocaleString()}
            sub={atRisk > 0 ? 'at risk + lapsed' : 'all good'}
            subColor={atRisk > 0 ? '#fbbf24' : '#4ade80'}
          />
          <StatCard
            label="Yara Credits"
            value={(merchant.credit_balance ?? 0).toLocaleString()}
            sub="buy more →"
            subLink="/pricing"
            highlight
          />
        </div>

        {/* ── Yara Recommendations (client component — fetches /api/insights) */}
        {isConnected && hasScores && <YaraRecommendations />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* ── Left col: Segments + customers ──────────────────────────── */}
          <div className="lg:col-span-2">

            {/* Connect prompt */}
            {!isConnected && (
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔗</div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                  Connect your POS
                </h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.9375rem', maxWidth: 360, margin: '0 auto 1.5rem' }}>
                  One click — we read your customers, score everyone, and show Yara who to target first.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <a href="/api/square/connect" style={btnStyle('violet')}>Connect Square</a>
                  <a href="/api/clover/connect" style={btnStyle('ghost')}>Connect Clover</a>
                </div>
              </div>
            )}

            {/* Sync progress */}
            {syncStatus === 'in_progress' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#fbbf24', fontWeight: 600 }}>↻ Syncing {posProvider === 'clover' ? 'Clover' : 'Square'} data… {syncProgress}%</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '100px', height: 6 }}>
                  <div style={{ background: 'var(--violet)', borderRadius: '100px', height: 6, width: `${syncProgress}%`, transition: 'width 0.5s ease' }} />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>Refresh in about a minute to see your customers.</p>
              </div>
            )}

            {/* Yara Autopilot toggle */}
            {isConnected && ['brain', 'empire'].includes(merchant.plan || '') && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                background: merchant.auto_campaigns_enabled ? 'rgba(124,92,252,0.1)' : 'var(--surface)',
                border: merchant.auto_campaigns_enabled ? '1px solid rgba(124,92,252,0.4)' : '1px solid var(--border)',
                borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem',
              }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--violet)' }}>✦</span> Yara Autopilot
                    <span style={{ fontSize: '0.75rem', background: merchant.auto_campaigns_enabled ? '#4ade80' : '#f87171', color: '#000', borderRadius: '100px', padding: '0.125rem 0.5rem', fontWeight: 700 }}>
                      {merchant.auto_campaigns_enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    Yara sends personalised campaigns automatically every day.
                  </div>
                </div>
                <form action={async () => {
                  'use server'
                  const { createServiceClient: sc } = await import('@/lib/supabase/server')
                  const s = sc()
                  await s.from('merchants').update({ auto_campaigns_enabled: !merchant.auto_campaigns_enabled }).eq('id', merchant.id)
                  const { redirect: r } = await import('next/navigation')
                  r('/dashboard')
                }}>
                  <button type="submit" style={{
                    background: merchant.auto_campaigns_enabled ? 'transparent' : 'var(--violet)',
                    color: merchant.auto_campaigns_enabled ? 'var(--text-secondary)' : '#fff',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    padding: '0.4rem 1rem', fontSize: '0.875rem', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    {merchant.auto_campaigns_enabled ? 'Turn off' : 'Turn on'}
                  </button>
                </form>
              </div>
            )}

            {/* Win-back banner */}
            {hasScores && atRisk > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(124,92,252,0.12) 0%, rgba(251,191,36,0.08) 100%)',
                border: '1px solid rgba(124,92,252,0.3)',
                borderRadius: '14px', padding: '1.25rem 1.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                flexWrap: 'wrap', marginBottom: '1.5rem',
              }}>
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.0625rem', marginBottom: '0.25rem' }}>
                    {atRisk} customers are drifting away
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    Yara can write a personalised message for each of them today.
                  </div>
                </div>
                <Link href="/campaigns" style={btnStyle('violet')}>
                  Launch win-back →
                </Link>
              </div>
            )}

            {/* Segment breakdown */}
            {hasScores && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                  Customer Segments
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['loyal', 'active', 'new', 'at_risk', 'lapsed', 'lost'] as const).map(seg => {
                    const meta  = SEGMENT_META[seg]
                    const count = segmentCounts[seg] || 0
                    const pct   = totalCustomers ? Math.round((count / totalCustomers) * 100) : 0
                    return (
                      <div key={seg} style={{ background: 'var(--surface)', border: `1px solid ${meta.color}25`, borderRadius: '10px', padding: '0.875rem 0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '0.4rem' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color }} />
                          <span style={{ color: meta.color, fontSize: '0.7rem', fontWeight: 600 }}>{meta.label}</span>
                        </div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{count.toLocaleString()}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '0.25rem' }}>{pct}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Customer table */}
            {customers && customers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                    Customers · ranked by score
                  </h2>
                  <Link href="/customers" style={{ fontSize: '0.8125rem', color: 'var(--violet)', textDecoration: 'none', fontWeight: 600 }}>
                    View all {custTotal?.toLocaleString()} →
                  </Link>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Customer', 'Segment', 'Score', 'LTV', 'Last visit'].map(h => (
                          <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c, i) => {
                        const seg = c.segment ? SEGMENT_META[c.segment] : null
                        const lastPurchase = c.last_purchase_at
                          ? relativeDate(c.last_purchase_at)
                          : '—'
                        return (
                          <tr key={c.id} style={{ borderBottom: i < customers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <td style={{ padding: '0.75rem 1rem' }}>
                              <Link href={`/customers/${c.id}`} style={{ fontWeight: 600, fontSize: '0.9rem', color: 'inherit', textDecoration: 'none' }}>
                                {c.name || 'Unknown'}
                              </Link>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '1px' }}>{c.email || c.phone || '—'}</div>
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
                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{lastPurchase}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-3">
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Page {page} of {totalPages}</span>
                    <div className="flex gap-2">
                      {page > 1 && <Link href={`?page=${page - 1}`} style={btnStyle('ghost')}>← Prev</Link>}
                      {page < totalPages && <Link href={`?page=${page + 1}`} style={btnStyle('ghost')}>Next →</Link>}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* ── Right col: Yara Activity Feed ────────────────────────────── */}
          <div>
            {/* Yara header */}
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1rem' }}>
              <div className="flex items-center gap-3 mb-3">
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'linear-gradient(135deg, #7C5CFC 0%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>✦</div>
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>Yara</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>AI Revenue Operator</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div style={{ background: 'rgba(124,92,252,0.08)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Campaigns</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.5rem' }}>{totalCampaignsSent}</div>
                </div>
                <div style={{ background: 'rgba(124,92,252,0.08)', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Credits</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.5rem', color: 'var(--violet)' }}>{(merchant.credit_balance ?? 0).toLocaleString()}</div>
                </div>
              </div>
              {!['brain', 'empire'].includes(merchant.plan || '') && (
                <Link href="/pricing" style={{ display: 'block', marginTop: '1rem', textAlign: 'center', background: 'var(--violet)', color: '#fff', borderRadius: '8px', padding: '0.625rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
                  Unlock Yara Autopilot →
                </Link>
              )}
            </div>

            {/* Activity feed */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem' }}>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
                Recent activity
              </h3>

              {!recentSends || recentSends.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1.5rem 0' }}>
                  No campaigns sent yet.<br />
                  <Link href="/campaigns" style={{ color: 'var(--violet)', fontWeight: 600, textDecoration: 'none' }}>Launch your first →</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  {recentSends.map((s: any) => {
                    const customer = s.customers
                    const seg = customer?.segment ? SEGMENT_META[customer.segment] : null
                    return (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'rgba(124,92,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0, color: 'var(--violet)' }}>
                          ✉
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {customer?.name || s.email || 'Customer'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '2px' }}>
                            {seg && <span style={{ background: seg.bg, color: seg.color, borderRadius: '100px', padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 600 }}>{seg.label}</span>}
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{s.sent_at ? relativeDate(s.sent_at) : ''}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {totalCampaignsSent > 0 && (
                <Link href="/campaigns" style={{ display: 'block', marginTop: '1rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--violet)', fontWeight: 600, textDecoration: 'none' }}>
                  View all campaigns →
                </Link>
              )}
            </div>

            {/* Recent campaigns */}
            {campaigns && campaigns.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem', marginTop: '1rem' }}>
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '1rem' }}>
                  Recent campaigns
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {campaigns.map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                      </div>
                      <span style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', borderRadius: '100px', padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 }}>
                        {c.total_sent ?? 0} sent
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Banner({ color, icon, children }: { color: 'green' | 'violet' | 'red'; icon: string; children: React.ReactNode }) {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    green:  { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   text: '#4ade80' },
    violet: { bg: 'rgba(124,92,252,0.1)',  border: 'rgba(124,92,252,0.35)', text: 'var(--violet)' },
    red:    { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171' },
  }
  const s = styles[color]
  return (
    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px', padding: '0.875rem 1.25rem', marginBottom: '1.5rem', color: s.text, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
      <span>{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function StatCard({ label, value, sub, subColor, subLink, highlight }: {
  label: string; value: string; sub?: string; subColor?: string; subLink?: string; highlight?: boolean
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: highlight ? '1px solid rgba(124,92,252,0.35)' : '1px solid var(--border)',
      borderRadius: '14px', padding: '1.25rem',
    }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>{label}</div>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, color: highlight ? 'var(--violet)' : 'inherit' }}>{value}</div>
      {sub && (
        subLink
          ? <Link href={subLink} style={{ fontSize: '0.75rem', color: 'var(--violet)', textDecoration: 'none', fontWeight: 600, display: 'block', marginTop: '0.25rem' }}>{sub}</Link>
          : <div style={{ fontSize: '0.75rem', color: subColor || 'var(--text-secondary)', marginTop: '0.25rem', fontWeight: 600 }}>{sub}</div>
      )}
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
    borderRadius: '8px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    textDecoration: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
  }
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
