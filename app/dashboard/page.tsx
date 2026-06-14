import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { square_connected?: string; square_error?: string }
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

  // Customer count
  const { count: customerCount } = await service
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)

  const { count: orderCount } = await service
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Top nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.125rem' }}>
            Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
          </span>
          <div className="flex items-center gap-4">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{merchant.business_name}</span>
            <form action={logout}>
              <button type="submit" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Log out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Success / error banners */}
        {searchParams.square_connected && (
          <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '2rem', color: '#4ade80', fontSize: '0.9375rem' }}>
            ✓ Square connected! We&apos;re syncing your customers and orders now — this takes a couple of minutes.
          </div>
        )}
        {searchParams.square_error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '2rem', color: '#f87171', fontSize: '0.9375rem' }}>
            Square connection failed ({searchParams.square_error}). Please try again.
          </div>
        )}

        {/* Header */}
        <div className="mb-10">
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            Good to have you, {merchant.business_name} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            {isConnected ? 'Your Square account is connected. Yara is getting to work.' : 'Connect your Square account to get started.'}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {[
            { label: 'Customers synced', value: customerCount?.toLocaleString() ?? '—' },
            { label: 'Orders synced', value: orderCount?.toLocaleString() ?? '—' },
            { label: 'Square status', value: isConnected ? 'Connected' : 'Not connected' },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{card.label}</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2rem', fontWeight: 800 }}>{card.value}</div>
            </div>
          ))}
        </div>

        {/* Square connection panel */}
        {!isConnected ? (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '20px', padding: '2.5rem', textAlign: 'center', maxWidth: '560px' }}>
            <div style={{ width: 56, height: 56, backgroundColor: 'rgba(124,92,252,0.12)', borderRadius: '16px', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>
              🔗
            </div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              Connect your Square account
            </h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '2rem', fontSize: '0.9375rem' }}>
              One click authorises RevOverflow to read your customers and orders. We never store your raw credentials — tokens are encrypted before saving.
            </p>
            <a
              href="/api/square/connect"
              style={{ display: 'inline-block', backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.875rem 2rem', fontSize: '1rem', textDecoration: 'none' }}
            >
              Connect Square
            </a>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '1rem' }}>
              Uses Square Sandbox for now — safe to test.
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem', maxWidth: '560px' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.375rem', fontWeight: 800, marginBottom: '1rem' }}>
              Square sync status
            </h2>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: syncStatus === 'complete' ? '#4ade80' : syncStatus === 'error' ? '#f87171' : '#fbbf24' }} />
              <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{syncStatus.replace('_', ' ')}</span>
            </div>
            {syncStatus === 'in_progress' && (
              <div>
                <div style={{ backgroundColor: 'var(--ink-muted)', borderRadius: '100px', height: 8, marginBottom: '0.5rem' }}>
                  <div style={{ backgroundColor: 'var(--violet)', borderRadius: '100px', height: 8, width: `${syncProgress}%`, transition: 'width 0.5s ease' }} />
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{syncProgress}% complete — this takes a minute or two</p>
              </div>
            )}
            {syncStatus === 'complete' && (
              <p style={{ color: '#4ade80', fontSize: '0.9375rem' }}>
                ✓ All done. {customerCount?.toLocaleString()} customers and {orderCount?.toLocaleString()} orders are ready.
              </p>
            )}
            {syncStatus === 'error' && (
              <p style={{ color: '#f87171', fontSize: '0.9375rem' }}>
                Something went wrong during sync. <a href="/api/square/connect" style={{ color: 'var(--violet-light)' }}>Reconnect Square</a> to try again.
              </p>
            )}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '1.5rem' }}>
              Square Merchant ID: <code style={{ color: 'var(--violet-light)' }}>{merchant.square_merchant_id}</code>
            </p>
          </div>
        )}

        {/* Coming soon note */}
        <div style={{ marginTop: '3rem', padding: '1.5rem', backgroundColor: 'var(--ink-light)', border: '1px solid var(--border)', borderRadius: '14px', maxWidth: '560px' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Next up:</strong> Sprint S-05 will add Yara&apos;s RFV scoring engine — your customers will be segmented and win-back campaigns will fire automatically.
          </p>
        </div>

      </div>
    </div>
  )
}
