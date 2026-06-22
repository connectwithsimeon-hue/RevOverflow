import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import OnboardingBanner from '@/app/components/OnboardingBanner'
import ReachableBaseMeter from '@/app/components/ReachableBaseMeter'
import GuaranteeBanner from '@/app/components/GuaranteeBanner'
import { computeGuaranteeStatus } from '@/lib/guarantee'
import YaraRecommendations from '@/app/components/YaraRecommendations'
import TrustScoreWidget from '@/app/components/TrustScoreWidget'
import GoalModeWidget from '@/app/components/GoalModeWidget'
import DashboardSidebar from '@/app/components/DashboardSidebar'

export const dynamic = 'force-dynamic'

const SEGMENT_META: Record<string, { label: string; color: string; bg: string }> = {
  loyal:   { label: 'Loyal',    color: 'var(--violet-dark)', bg: 'rgba(167,139,250,0.12)' },
  active:  { label: 'Active',   color: '#15803d', bg: 'rgba(74,222,128,0.12)'  },
  new:     { label: 'New',      color: '#1d4ed8', bg: 'rgba(96,165,250,0.12)'  },
  at_risk: { label: 'At Risk',  color: '#92400e', bg: 'rgba(251,191,36,0.12)'  },
  lapsed:  { label: 'Lapsed',   color: '#c2410c', bg: 'rgba(251,146,60,0.12)'  },
  lost:    { label: 'Lost',     color: '#b91c1c', bg: 'rgba(248,113,113,0.12)' },
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: {
    square_connected?: string
    square_error?: string
    clover_connected?: string
    clover_error?: string
    toast_connected?: string
    toast_error?: string
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

  // A merchant can connect more than one POS at once — up to all 3 adapters
  // RevOverflow has today. Customer rows from each are merged into one
  // unified base by lib/customer-match.ts, so connecting more than one is
  // safe and encouraged for merchants who actually run more than one system.
  const connectedProviders: ('square' | 'clover' | 'toast')[] = [
    merchant.square_merchant_id ? ('square' as const) : null,
    merchant.clover_merchant_id ? ('clover' as const) : null,
    merchant.toast_restaurant_guid ? ('toast' as const) : null,
  ].filter((p): p is 'square' | 'clover' | 'toast' => p !== null)
  const isConnected = connectedProviders.length > 0
  // Used only where the UI still needs to name a single provider (e.g. the
  // sync-progress label) — picks the first connected one.
  const posProvider: 'square' | 'clover' | 'toast' | null = connectedProviders[0] ?? null
  const syncStatus  = merchant.sync_status as string
  const syncProgress = merchant.sync_progress as number

  // ── Revenue recovered (attributed from campaigns) ─────────────────────────
  const { data: revenueRows } = await service
    .from('orders')
    .select('total_amount, ordered_at')
    .eq('merchant_id', merchant.id)
    .gte('ordered_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

  // ── Last 7 days, bucketed by day (for the revenue chart) ─────────────────
  const dayBuckets: { date: string; label: string; amount: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dayBuckets.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      amount: 0,
    })
  }
  for (const row of revenueRows ?? []) {
    const day = (row.ordered_at as string)?.slice(0, 10)
    const bucket = dayBuckets.find(b => b.date === day)
    if (bucket) bucket.amount += parseFloat(row.total_amount ?? '0')
  }
  const maxDayAmount = Math.max(1, ...dayBuckets.map(b => b.amount))

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

  const initials = (merchant.business_name || 'R')
    .split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex' }}>
      <DashboardSidebar active="dashboard" plan={merchant.plan} />

      <main style={{ flex: 1, minWidth: 0 }}>
        {/* ── Topbar ────────────────────────────────────────────────────── */}
        <div style={{
          height: 72, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40,
          backgroundColor: 'rgba(247,247,251,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Dashboard</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.0625rem' }}>
              Welcome back{merchant.business_name ? `, ${merchant.business_name}` : ''} 👋
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
          <Banner color="red" icon="✕">Square error: {searchParams.square_error}. <a href="/api/square/connect" style={{ color: '#1d4ed8' }}>Try again</a></Banner>
        )}
        {searchParams.clover_connected && (
          <Banner color="green" icon="✓">Clover connected — syncing your customers and orders now.</Banner>
        )}
        {searchParams.clover_error && (
          <Banner color="red" icon="✕">Clover error: {searchParams.clover_error}. <a href="/api/clover/connect" style={{ color: '#1d4ed8' }}>Try again</a></Banner>
        )}
        {searchParams.toast_connected && (
          <Banner color="green" icon="✓">Toast connected — syncing your customers and orders now.</Banner>
        )}
        {searchParams.toast_error && (
          <Banner color="red" icon="✕">Toast error: {searchParams.toast_error}. <a href="/dashboard/connect-toast" style={{ color: '#1d4ed8' }}>Try again</a></Banner>
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
                  color:      mode === 'A' ? 'var(--violet)'          : '#92400e',
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
            {syncStatus !== 'in_progress' && connectedProviders.map((p) => (
              <a
                key={p}
                href={p === 'clover' ? '/api/clover/sync-trigger' : p === 'toast' ? '/api/toast/sync-trigger' : '/api/square/sync-trigger'}
                style={btnStyle('ghost')}
              >
                ↻ Sync{connectedProviders.length > 1 ? ` ${p === 'clover' ? 'Clover' : p === 'toast' ? 'Toast' : 'Square'}` : ''}
              </a>
            ))}
            {hasScores && atRisk > 0 && (
              <Link href="/campaigns" style={btnStyle('violet')}>✦ Launch Campaign</Link>
            )}
            {/* Connect buttons — only shown for POS systems not yet connected.
                A merchant can connect more than one at a time. */}
            {!connectedProviders.includes('square') && (
              <a href="/api/square/connect" style={btnStyle(isConnected ? 'ghost' : 'violet')}>Connect Square →</a>
            )}
            {!connectedProviders.includes('clover') && (
              <a href="/api/clover/connect" style={btnStyle('ghost')}>Connect Clover →</a>
            )}
            {!connectedProviders.includes('toast') && (
              <Link href="/dashboard/connect-toast" style={btnStyle('ghost')}>Connect Toast →</Link>
            )}
          </div>
        </div>

        {/* ── Top section: KPI board + Reachable Audience board ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <KpiCard
              icon="💰" gradient="linear-gradient(135deg, #7C5CFC 0%, #a78bfa 100%)" accent="#7C5CFC"
              label="Revenue This Month"
              value={`$${thisMonthRev.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              trendPct={lastMonthRev > 0 ? revChange : undefined}
            />
            <KpiCard
              icon="👥" gradient="linear-gradient(135deg, #60a5fa 0%, #38bdf8 100%)" accent="#60a5fa"
              label="Total Customers"
              value={totalCustomers.toLocaleString()}
              footnote={`${reachable.toLocaleString()} reachable`}
            />
            <KpiCard
              icon="⚠️" gradient="linear-gradient(135deg, #fbbf24 0%, #fb923c 100%)" accent="#fbbf24"
              label="Need Win-back"
              value={atRisk.toLocaleString()}
              footnote={atRisk > 0 ? 'at risk + lapsed' : 'all good'}
              footnoteColor={atRisk > 0 ? '#92400e' : '#15803d'}
            />
            <KpiCard
              icon="✦" gradient="linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)" accent="#4ade80"
              label="Yara Credits"
              value={(merchant.credit_balance ?? 0).toLocaleString()}
              footnote="buy more →"
              footnoteLink="/pricing"
            />
          </div>
          <ReachableBaseMeter reachable={reachable} total={totalCustomers} modeA={modeA} />
        </div>

        {/* ── Guarantee banner ──────────────────────────────────────────── */}
        {guarantee?.eligible && (
          <GuaranteeBanner {...guarantee} />
        )}

        {/* ── Onboarding guide ─────────────────────────────────────────── */}
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

        {/* ── Revenue chart ─────────────────────────────────────────────── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '0.9375rem' }}>Revenue — last 7 days</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                ${dayBuckets.reduce((s, b) => s + b.amount, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })} total
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', height: 140 }}>
            {dayBuckets.map((b, i) => {
              const heightPct = Math.max(4, Math.round((b.amount / maxDayAmount) * 100))
              const isToday = i === dayBuckets.length - 1
              return (
                <div key={b.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {b.amount > 0 ? `$${b.amount.toFixed(0)}` : ''}
                  </div>
                  <div style={{
                    width: '100%', maxWidth: 36, borderRadius: '6px 6px 2px 2px',
                    height: `${heightPct}%`, minHeight: 4,
                    background: isToday ? 'linear-gradient(180deg, #a78bfa 0%, #7C5CFC 100%)' : 'rgba(124,92,252,0.25)',
                    transition: 'height 0.4s ease',
                  }} />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: isToday ? 700 : 500 }}>{b.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Yara Recommendations (client component — fetches /api/insights) */}
        {isConnected && hasScores && <YaraRecommendations />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* ── Left col: Segments + customers ──────────────────────────── */}
          <div className="lg:col-span-2">

            {/* Connect prompt — shown until all 3 POS adapters are connected.
                A merchant running more than one system at once can connect
                each in turn; every customer still lands in one merged base. */}
            {connectedProviders.length < 3 && (
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔗</div>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                  {isConnected ? 'Connect another POS' : 'Connect your POS'}
                </h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.9375rem', maxWidth: 380, margin: '0 auto 1.5rem' }}>
                  {isConnected
                    ? `Connected: ${connectedProviders.map(p => p === 'clover' ? 'Clover' : p === 'toast' ? 'Toast' : 'Square').join(', ')}. Run more than one system? Connect the rest — every customer lands in the same base.`
                    : 'One click — we read your customers, score everyone, and show Yara who to target first.'}
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {!connectedProviders.includes('square') && (
                    <a href="/api/square/connect" style={btnStyle(isConnected ? 'ghost' : 'violet')}>Connect Square</a>
                  )}
                  {!connectedProviders.includes('clover') && (
                    <a href="/api/clover/connect" style={btnStyle('ghost')}>Connect Clover</a>
                  )}
                  {!connectedProviders.includes('toast') && (
                    <Link href="/dashboard/connect-toast" style={btnStyle('ghost')}>Connect Toast</Link>
                  )}
                </div>
              </div>
            )}

            {/* Sync progress */}
            {syncStatus === 'in_progress' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  {/* sync_status/sync_progress are shared columns on `merchants`,
                      not tracked per-POS, so once more than one is connected
                      we can't reliably say which one is mid-sync — name it
                      only when there's exactly one connected provider. */}
                  <span style={{ color: '#92400e', fontWeight: 600 }}>
                    ↻ Syncing {connectedProviders.length === 1 ? (posProvider === 'clover' ? 'Clover' : posProvider === 'toast' ? 'Toast' : 'Square') + ' ' : ''}data… {syncProgress}%
                  </span>
                </div>
                <div style={{ background: 'rgba(21,21,31,0.05)', borderRadius: '100px', height: 6 }}>
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
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, marginBottom: '0.875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                  Customer Segments
                </h2>
                {/* Stacked composition bar */}
                <div style={{ display: 'flex', height: 8, borderRadius: '100px', overflow: 'hidden', marginBottom: '1rem' }}>
                  {(['loyal', 'active', 'new', 'at_risk', 'lapsed', 'lost'] as const).map(seg => {
                    const count = segmentCounts[seg] || 0
                    const pct = totalCustomers ? (count / totalCustomers) * 100 : 0
                    if (pct === 0) return null
                    return <div key={seg} style={{ width: `${pct}%`, background: SEGMENT_META[seg].color }} />
                  })}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(['loyal', 'active', 'new', 'at_risk', 'lapsed', 'lost'] as const).map(seg => {
                    const meta  = SEGMENT_META[seg]
                    const count = segmentCounts[seg] || 0
                    const pct   = totalCustomers ? Math.round((count / totalCustomers) * 100) : 0
                    return (
                      <div key={seg} style={{ background: 'var(--ink)', border: `1px solid ${meta.color}25`, borderRadius: '10px', padding: '0.875rem 0.75rem' }}>
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
                        const custInitials = (c.name || '?').split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('') || '?'
                        return (
                          <tr key={c.id} style={{ borderBottom: i < customers.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 1 ? 'rgba(21,21,31,0.015)' : 'transparent' }}>
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
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Brings your customers back</div>
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
                      <span style={{ background: 'rgba(74,222,128,0.1)', color: '#15803d', borderRadius: '100px', padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 600, flexShrink: 0 }}>
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
      </main>
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

function KpiCard({ icon, gradient, accent, label, value, trendPct, footnote, footnoteColor, footnoteLink }: {
  icon: string; gradient: string; accent: string; label: string; value: string
  trendPct?: number; footnote?: string; footnoteColor?: string; footnoteLink?: string
}) {
  const trendUp = (trendPct ?? 0) >= 0
  return (
    <div style={{
      background: `linear-gradient(160deg, ${accent}1a 0%, var(--surface) 65%)`,
      border: '1px solid var(--border)',
      borderRadius: '18px', padding: '1.375rem',
      boxShadow: '0 6px 20px -10px rgba(16,24,40,0.12)',
    }}>
      <div className="flex items-center justify-between mb-3">
        <div style={{
          width: 42, height: 42, borderRadius: '12px', background: gradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem',
          boxShadow: `0 4px 14px -4px ${accent}40`,
        }}>
          {icon}
        </div>
        {trendPct !== undefined && (
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, borderRadius: '100px', padding: '0.2rem 0.5rem',
            background: trendUp ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
            color: trendUp ? '#4ade80' : '#f87171',
          }}>
            {trendUp ? '↑' : '↓'} {Math.abs(trendPct).toFixed(0)}%
          </span>
        )}
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {footnote && (
        footnoteLink
          ? <Link href={footnoteLink} style={{ fontSize: '0.75rem', color: 'var(--violet)', textDecoration: 'none', fontWeight: 600, display: 'block', marginTop: '0.5rem' }}>{footnote}</Link>
          : <div style={{ fontSize: '0.75rem', color: footnoteColor || 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 600 }}>{footnote}</div>
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
