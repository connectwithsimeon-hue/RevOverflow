import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import HowToGuide from '@/app/components/HowToGuide'
import GoalHeader from '@/app/components/GoalHeader'
import YaraGoalPlan from '@/app/components/YaraGoalPlan'
import ReachableBaseMeter from '@/app/components/ReachableBaseMeter'
import TrustScoreWidget from '@/app/components/TrustScoreWidget'
import GuaranteeBanner from '@/app/components/GuaranteeBanner'
import OnboardingBanner from '@/app/components/OnboardingBanner'
import { computeGuaranteeStatus } from '@/lib/guarantee'
import { planMonthlyCost } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default async function DashboardPage({ searchParams }: {
  searchParams: {
    square_connected?: string; square_error?: string
    clover_connected?: string; clover_error?: string
    toast_connected?: string; toast_error?: string
    lightspeed_connected?: string; lightspeed_error?: string
    page?: string; billing?: string; credits?: string; syncing?: string
  }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: merchant } = await service.from('merchants').select('*, vip_slug').eq('auth_user_id', user.id).single()
  if (!merchant) redirect('/login')

  const connectedProviders: ('square' | 'clover' | 'toast' | 'lightspeed')[] = [
    merchant.square_merchant_id ? ('square' as const) : null,
    merchant.clover_merchant_id ? ('clover' as const) : null,
    merchant.toast_restaurant_guid ? ('toast' as const) : null,
    merchant.lightspeed_domain_prefix ? ('lightspeed' as const) : null,
  ].filter((p): p is 'square' | 'clover' | 'toast' | 'lightspeed' => p !== null)
  const isConnected = connectedProviders.length > 0
  const syncStatus = merchant.sync_status as string

  // Segment counts → reachable / at-risk / total
  const { data: segmentRows } = await service.from('customers').select('segment').eq('merchant_id', merchant.id).not('segment', 'is', null)
  const counts: Record<string, number> = {}
  for (const r of segmentRows || []) if (r.segment) counts[r.segment] = (counts[r.segment] || 0) + 1
  const totalCustomers = Object.values(counts).reduce((a, b) => a + b, 0)
  const atRisk = (counts['at_risk'] || 0) + (counts['lapsed'] || 0)
  const reachable = (counts['loyal'] || 0) + (counts['active'] || 0) + (counts['new'] || 0) + (counts['at_risk'] || 0) + (counts['lapsed'] || 0)
  const hasScores = (segmentRows?.length || 0) > 0
  const modeA = reachable >= 1000

  // Guarantee → revenue recovered + ROI
  const guarantee = await computeGuaranteeStatus(merchant.id)
  const revenueRecovered = guarantee?.revenueRecovered ?? 0
  const planCost = planMonthlyCost(merchant.plan)
  const roiMultiple = guarantee?.roiMultiple ?? (planCost > 0 ? revenueRecovered / planCost : 0)
  const hasVipSetup = !!merchant.vip_slug

  // Campaign counts
  const [{ count: campaignsSent }, { count: campaignsRunning }] = await Promise.all([
    service.from('campaigns').select('id', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'sent'),
    service.from('campaigns').select('id', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'active'),
  ])
  const totalCampaignsSent = campaignsSent ?? 0

  // 7-day revenue sparkline
  const { data: revRows } = await service.from('orders').select('total_amount, ordered_at').eq('merchant_id', merchant.id).gte('ordered_at', new Date(Date.now() - 7 * 86400000).toISOString())
  const buckets = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { day: d.toISOString().slice(0, 10), amt: 0 } })
  for (const r of revRows ?? []) { const b = buckets.find(x => x.day === (r.ordered_at as string)?.slice(0, 10)); if (b) b.amt += parseFloat(r.total_amount ?? '0') }
  const spark = buckets.map(b => b.amt)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = (merchant.business_name || '').split(' ')[0] || 'there'
  const initials = (merchant.business_name || 'R').split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')
  const allConnected = connectedProviders.length === 4

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex' }}>
      <DashboardSidebar active="dashboard" plan={merchant.plan} />

      <main style={{ flex: 1, minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ height: 72, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40, backgroundColor: 'rgba(247,247,251,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.0625rem' }}>Dashboard</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <HowToGuide />
            <Link href="/pricing" style={{ fontSize: '0.8125rem', background: 'var(--violet)', color: '#fff', padding: '0.5rem 1.125rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Upgrade</Link>
            <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7C5CFC 0%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8125rem', color: '#fff' }}>{initials}</div>
          </div>
        </div>

        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '2.25rem 2rem 3rem' }}>

          {/* Flash banners */}
          {searchParams.billing === 'success' && <Banner color="green" icon="🎉">Welcome to RevOverflow! Your subscription is active. Yara is ready to work.</Banner>}
          {searchParams.credits === 'purchased' && <Banner color="violet" icon="✦">Credits added! New balance: {(merchant.credit_balance ?? 0).toLocaleString()} Yara credits.</Banner>}
          {searchParams.square_connected && <Banner color="green" icon="✓">Square connected — syncing your customers and orders now.</Banner>}
          {searchParams.square_error && <Banner color="red" icon="✕">Square error: {searchParams.square_error}. <a href="/api/square/connect" style={{ color: '#1d4ed8' }}>Try again</a></Banner>}
          {searchParams.clover_connected && <Banner color="green" icon="✓">Clover connected — syncing now.</Banner>}
          {searchParams.clover_error && <Banner color="red" icon="✕">Clover error: {searchParams.clover_error}. <a href="/api/clover/connect" style={{ color: '#1d4ed8' }}>Try again</a></Banner>}
          {searchParams.toast_connected && <Banner color="green" icon="✓">Toast connected — syncing now.</Banner>}
          {searchParams.toast_error && <Banner color="red" icon="✕">Toast error: {searchParams.toast_error}. <a href="/dashboard/connect-toast" style={{ color: '#1d4ed8' }}>Try again</a></Banner>}
          {searchParams.lightspeed_connected && <Banner color="green" icon="✓">Lightspeed connected — syncing now.</Banner>}
          {searchParams.lightspeed_error && <Banner color="red" icon="✕">Lightspeed error: {searchParams.lightspeed_error}. <a href="/api/lightspeed/connect" style={{ color: '#1d4ed8' }}>Try again</a></Banner>}
          {searchParams.syncing && <Banner color="violet" icon="↻">Syncing your data — refresh in about 30 seconds.</Banner>}

          {/* Greeting + connect actions */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>{greeting}, {name} 👋</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, margin: '4px 0 0' }}>
                {!isConnected ? 'Connect your POS so Yara can start finding revenue.' : syncStatus && syncStatus !== 'complete' ? 'Syncing your data…' : "Here's how you're doing this month."}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!connectedProviders.includes('square') && <a href="/api/square/connect" style={btnStyle(isConnected ? 'ghost' : 'violet')}>Connect Square →</a>}
              {!connectedProviders.includes('clover') && <a href="/api/clover/connect" style={btnStyle('ghost')}>Connect Clover →</a>}
              {!connectedProviders.includes('toast') && <Link href="/dashboard/connect-toast" style={btnStyle('ghost')}>Connect Toast →</Link>}
              {!connectedProviders.includes('lightspeed') && <a href="/api/lightspeed/connect" style={btnStyle('ghost')}>Connect Lightspeed →</a>}
              {allConnected && (<><span style={chip}>This month</span><span style={chip}>All locations</span></>)}
            </div>
          </div>

          {/* Goal trio */}
          <div style={{ marginBottom: 18 }}><GoalHeader /></div>

          {/* Plan + KPI rail */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 18, alignItems: 'start' }}>
            <YaraGoalPlan />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <KpiCard label="Revenue Recovered" value={money(revenueRecovered)} accent="#15803d" spark={spark} />
              <KpiCard label="Campaigns Running" value={String(campaignsRunning ?? 0)} sub="live" />
              <KpiCard label="Reachable Customers" value={reachable.toLocaleString()} />
              <KpiCard label="ROI This Month" value={`${roiMultiple.toFixed(1)}x`} accent="var(--violet)" />
            </div>
          </div>

          {/* Guarantee */}
          {guarantee?.eligible && <div style={{ marginTop: 18 }}><GuaranteeBanner {...guarantee} /></div>}

          {/* Onboarding guidance */}
          <div style={{ marginTop: 18 }}>
            <OnboardingBanner isConnected={isConnected} hasSynced={hasScores} hasCampaign={totalCampaignsSent > 0} modeA={modeA} hasVipSetup={hasVipSetup} reachable={reachable} />
          </div>

          {/* Details — kept, finer */}
          {isConnected && hasScores && (
            <div style={{ marginTop: 30 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Details</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <ReachableBaseMeter reachable={reachable} total={totalCustomers} modeA={modeA} />
                <TrustScoreWidget />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function KpiCard({ label, value, sub, accent, spark }: { label: string; value: string; sub?: string; accent?: string; spark?: number[] }) {
  return (
    <div style={cardSoft}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, lineHeight: 1, color: accent || 'inherit' }}>{value}</span>
        {sub && <span style={{ fontSize: 12, color: '#15803d', fontWeight: 700 }}>● {sub}</span>}
      </div>
      {spark && spark.some(v => v > 0) && <Sparkline data={spark} color={accent || 'var(--violet)'} />}
    </div>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 230, h = 36, max = Math.max(...data, 1), min = Math.min(...data), range = (max - min) || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 6) - 3}`).join(' ')
  return <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 36, marginTop: 10, display: 'block' }} preserveAspectRatio="none"><polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function Banner({ color, icon, children }: { color: 'green' | 'violet' | 'red'; icon: string; children: React.ReactNode }) {
  const styles: Record<string, { bg: string; border: string; text: string }> = {
    green:  { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)',  text: '#15803d' },
    violet: { bg: 'rgba(124,92,252,0.1)', border: 'rgba(124,92,252,0.35)', text: 'var(--violet)' },
    red:    { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  text: '#b91c1c' },
  }
  const s = styles[color]
  return <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '0.875rem 1.25rem', marginBottom: '1.5rem', color: s.text, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}><span>{icon}</span><span>{children}</span></div>
}

const chip: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }
const cardSoft: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.1rem 1.25rem' }

function btnStyle(variant: 'violet' | 'ghost'): React.CSSProperties {
  if (variant === 'violet') return { display: 'inline-block', background: 'var(--violet)', color: '#fff', borderRadius: 10, fontWeight: 700, padding: '0.625rem 1.25rem', fontSize: '0.9rem', textDecoration: 'none' }
  return { display: 'inline-block', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }
}
