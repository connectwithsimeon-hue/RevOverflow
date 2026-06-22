import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'cleanrideapp@gmail.com'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  // Auth guard — only the admin email can access this page
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  const service = createServiceClient()

  // Pull all merchants
  const { data: merchants } = await service
    .from('merchants')
    .select('id, business_name, plan, credit_balance, credits_included, auto_campaigns_enabled, sync_status, last_synced_at, created_at, auth_user_id')
    .order('created_at', { ascending: false })

  // Pull customer counts per merchant
  const { data: customerCounts } = await service
    .from('customers')
    .select('merchant_id')

  // Pull recent credit_ledger entries (last 50)
  const { data: ledger } = await service
    .from('credit_ledger')
    .select('merchant_id, action, amount, description, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  // Build a map: merchant_id → customer count
  const countMap: Record<string, number> = {}
  for (const row of customerCounts ?? []) {
    countMap[row.merchant_id] = (countMap[row.merchant_id] ?? 0) + 1
  }

  const totalMerchants = merchants?.length ?? 0
  const totalCreditsOut = (ledger ?? []).filter(l => l.amount < 0).reduce((s, l) => s + Math.abs(l.amount), 0)
  const paidMerchants = (merchants ?? []).filter(m => m.plan !== 'starter').length

  function planBadge(plan: string) {
    const colors: Record<string, string> = {
      starter: '#6b7280',
      brain: '#7c5cfc',
      empire: '#f59e0b',
    }
    return colors[plan] ?? '#6b7280'
  }

  function syncBadge(status: string | null) {
    if (status === 'complete') return { color: '#10b981', label: 'Synced' }
    if (status === 'in_progress') return { color: '#f59e0b', label: 'Syncing' }
    return { color: '#6b7280', label: status ?? 'None' }
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function fmtTime(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif", padding: '2rem' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.75rem', marginBottom: '0.25rem' }}>
              🛡️ Admin Panel
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>RevOverflow</p>
          </div>
          <a href="/dashboard" style={{ color: 'var(--violet-light)', textDecoration: 'none', fontSize: '0.875rem' }}>← Back to dashboard</a>
        </div>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Total merchants', value: totalMerchants },
            { label: 'Paid plans', value: paidMerchants },
            { label: 'Free (Starter)', value: totalMerchants - paidMerchants },
            { label: 'Credits used (last 50 txns)', value: totalCreditsOut.toLocaleString() },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem' }}>{card.value}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Merchant table */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', marginBottom: '2.5rem', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1rem' }}>All Merchants</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Business', 'Plan', 'Credits', 'Customers', 'Auto-Yara', 'Sync', 'Joined'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(merchants ?? []).map((m, i) => {
                  const sync = syncBadge(m.sync_status)
                  return (
                    <tr key={m.id} style={{ borderBottom: i < (merchants?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(21,21,31,0.015)' }}>
                      <td style={{ padding: '0.875rem 1.25rem', fontWeight: 600 }}>{m.business_name}</td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{ backgroundColor: planBadge(m.plan) + '22', color: planBadge(m.plan), border: `1px solid ${planBadge(m.plan)}44`, borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          {m.plan}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{ fontWeight: 700 }}>{(m.credit_balance ?? 0).toLocaleString()}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}> / {(m.credits_included ?? 0).toLocaleString()}</span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>{(countMap[m.id] ?? 0).toLocaleString()}</td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{ color: m.auto_campaigns_enabled ? '#10b981' : '#6b7280' }}>
                          {m.auto_campaigns_enabled ? '✅ On' : '⏸ Off'}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem' }}>
                        <span style={{ color: sync.color }}>{sync.label}</span>
                        {m.last_synced_at && (
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{fmtTime(m.last_synced_at)}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.875rem 1.25rem', color: 'var(--text-secondary)' }}>{fmtDate(m.created_at)}</td>
                    </tr>
                  )
                })}
                {!merchants?.length && (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No merchants yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent credit ledger */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1rem' }}>Recent Credit Activity <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '0.8125rem' }}>(last 50)</span></h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Merchant', 'Action', 'Credits', 'Note', 'When'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1.25rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(ledger ?? []).map((row, i) => {
                  const merchant = (merchants ?? []).find(m => m.id === row.merchant_id)
                  const isDebit = row.amount < 0
                  return (
                    <tr key={i} style={{ borderBottom: i < (ledger?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '0.75rem 1.25rem', fontWeight: 600 }}>{merchant?.business_name ?? row.merchant_id.slice(0, 8) + '…'}</td>
                      <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-secondary)' }}>{row.action}</td>
                      <td style={{ padding: '0.75rem 1.25rem', fontWeight: 700, color: isDebit ? '#f87171' : '#10b981' }}>
                        {isDebit ? '' : '+'}{row.amount}
                      </td>
                      <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description ?? '—'}</td>
                      <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtTime(row.created_at)}</td>
                    </tr>
                  )
                })}
                {!ledger?.length && (
                  <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No activity yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
