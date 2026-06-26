import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import GoalHeader from '@/app/components/GoalHeader'
import YaraPlan from '@/app/components/YaraPlan'
import TrustScoreWidget from '@/app/components/TrustScoreWidget'
import ReachableBaseMeter from '@/app/components/ReachableBaseMeter'
import { computeGoalProgress } from '@/lib/goal-mode'
import { planMonthlyCost } from '@/lib/plans'

export const dynamic = 'force-dynamic'

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default async function DashboardPreview() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: merchant } = await service.from('merchants').select('*').eq('auth_user_id', user.id).single()
  if (!merchant) redirect('/login')

  const isConnected = !!(merchant.square_merchant_id || merchant.clover_merchant_id || merchant.toast_restaurant_guid || merchant.lightspeed_domain_prefix)

  // ── Real numbers for the right-rail KPIs ──
  const goal = await computeGoalProgress(merchant.id).catch(() => null)
  const revenueRecovered = goal?.revenueAttributed ?? 0
  const planCost = planMonthlyCost(merchant.plan)
  const roi = planCost > 0 ? revenueRecovered / planCost : 0

  const [{ count: reachable }, { count: totalCustomers }, { count: campaignsRunning }] = await Promise.all([
    service.from('customers').select('id', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('is_reachable', true),
    service.from('customers').select('id', { count: 'exact', head: true }).eq('merchant_id', merchant.id),
    service.from('campaigns').select('id', { count: 'exact', head: true }).eq('merchant_id', merchant.id).eq('status', 'active'),
  ])

  // ── 7-day order revenue for the sparkline ──
  const { data: revRows } = await service
    .from('orders').select('total_amount, ordered_at')
    .eq('merchant_id', merchant.id)
    .gte('ordered_at', new Date(Date.now() - 7 * 86400000).toISOString())
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { day: d.toISOString().slice(0, 10), amt: 0 }
  })
  for (const r of revRows ?? []) {
    const b = buckets.find(x => x.day === (r.ordered_at as string)?.slice(0, 10))
    if (b) b.amt += parseFloat(r.total_amount ?? '0')
  }
  const spark = buckets.map(b => b.amt)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = (merchant.business_name || '').split(' ')[0] || 'there'

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex' }}>
      <DashboardSidebar active="dashboard" plan={merchant.plan} />

      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '2.25rem 2rem 3rem' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>{greeting}, {name} 👋</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14.5, margin: '4px 0 0' }}>Here&apos;s how you&apos;re doing this month.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={chip}>This month</span>
              <span style={chip}>All locations</span>
            </div>
          </div>

          {!isConnected && (
            <div style={{ ...cardSoft, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Connect your POS so Yara can start finding revenue.</span>
              <Link href="/dashboard" style={{ ...primaryLink }}>Connect POS →</Link>
            </div>
          )}

          {/* Goal trio */}
          <div style={{ marginBottom: 18 }}>
            <GoalHeader />
          </div>

          {/* Plan + KPI rail */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 18, alignItems: 'start' }}>
            <YaraPlan />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <KpiCard label="Revenue Recovered" value={money(revenueRecovered)} accent="#15803d" spark={spark} />
              <KpiCard label="Campaigns Running" value={String(campaignsRunning ?? 0)} sub="live" />
              <KpiCard label="Reachable Customers" value={(reachable ?? 0).toLocaleString()} />
              <KpiCard label="ROI This Month" value={`${roi.toFixed(1)}x`} accent="var(--violet)" />
            </div>
          </div>

          {/* Details — kept, but finer */}
          <div style={{ marginTop: 30 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>Details</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <ReachableBaseMeter reachable={reachable ?? 0} total={totalCustomers ?? 0} modeA={(reachable ?? 0) >= 1000} />
              <TrustScoreWidget />
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

function KpiCard({ label, value, sub, accent, spark }: { label: string; value: string; sub?: string; accent?: string; spark?: number[] }) {
  return (
    <div style={cardSoft as React.CSSProperties}>
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
  const w = 230, h = 36, max = Math.max(...data, 1), min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 6) - 3}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 36, marginTop: 10, display: 'block' }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const chip: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }
const cardSoft: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.1rem 1.25rem' }
const primaryLink: React.CSSProperties = { background: 'var(--violet)', color: '#fff', borderRadius: 10, fontWeight: 700, padding: '0.6rem 1.1rem', fontSize: 14, textDecoration: 'none', whiteSpace: 'nowrap' }
