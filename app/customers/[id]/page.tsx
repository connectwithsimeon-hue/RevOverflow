import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'
import Link from 'next/link'

const SEGMENT_META: Record<string, { label: string; color: string; bg: string; description: string }> = {
  loyal:   { label: 'Loyal',   color: 'var(--violet-dark)', bg: 'rgba(167,139,250,0.1)', description: 'High-value regular' },
  active:  { label: 'Active',  color: '#15803d', bg: 'rgba(74,222,128,0.1)',  description: 'Buying consistently' },
  new:     { label: 'New',     color: '#1d4ed8', bg: 'rgba(96,165,250,0.1)',  description: 'First purchase' },
  at_risk: { label: 'At Risk', color: '#92400e', bg: 'rgba(251,191,36,0.1)', description: 'Starting to drift' },
  lapsed:  { label: 'Lapsed',  color: '#c2410c', bg: 'rgba(251,146,60,0.1)', description: 'Haven\'t bought in 4+ months' },
  lost:    { label: 'Lost',    color: '#b91c1c', bg: 'rgba(248,113,113,0.1)', description: 'Gone over a year' },
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, plan')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) redirect('/login')

  const { data: customer } = await service
    .from('customers')
    .select('*')
    .eq('id', params.id)
    .eq('merchant_id', merchant.id)
    .single()
  if (!customer) notFound()

  const { data: orders } = await service
    .from('orders')
    .select('id, amount, created_at, source')
    .eq('customer_id', customer.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: campaignSends } = await service
    .from('campaign_sends')
    .select('id, sent_at, is_control_group, converted_at, conversion_value, campaigns(name, subject, sent_at)')
    .eq('customer_id', customer.id)
    .order('sent_at', { ascending: false })
    .limit(10)

  const seg = customer.segment ? SEGMENT_META[customer.segment] : null
  const lastPurchase = customer.last_purchase_at
    ? new Date(customer.last_purchase_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'Never'
  const joined = customer.created_at
    ? new Date(customer.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between h-16">
          <Link href="/dashboard" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.125rem', textDecoration: 'none', color: 'inherit' }}>
            Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
          </Link>
          <div className="flex items-center gap-4">
            <span style={{ backgroundColor: 'rgba(124,92,252,0.15)', color: 'var(--violet)', border: '1px solid rgba(124,92,252,0.35)', borderRadius: '100px', padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'capitalize' }}>
              {merchant.plan || 'free'} plan
            </span>
            <Link href="/dashboard" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>Dashboard</Link>
            <Link href="/campaigns" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>Campaigns</Link>
            <Link href="/account" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>Account</Link>
            <form action={logout}>
              <button type="submit" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Log out</button>
            </form>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* Back link */}
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '1.5rem' }}>
          ← Back to dashboard
        </Link>

        {/* Customer header */}
        <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem' }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800 }}>
                  {customer.name || 'Unknown customer'}
                </h1>
                {seg && (
                  <span style={{ backgroundColor: seg.bg, color: seg.color, border: `1px solid ${seg.color}40`, borderRadius: '100px', padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 700 }}>
                    {seg.label}
                  </span>
                )}
                {customer.control_group && (
                  <span style={{ backgroundColor: 'rgba(21,21,31,0.05)', color: 'var(--text-secondary)', borderRadius: '100px', padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 600 }}>
                    Control group
                  </span>
                )}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                {customer.email && <span style={{ marginRight: '1rem' }}>{customer.email}</span>}
                {customer.phone && <span>{customer.phone}</span>}
              </div>
              {seg && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>{seg.description}</div>
              )}
            </div>
            {/* Customer Score */}
            {customer.rfv_score != null && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>Customer Score</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: 'var(--violet)', lineHeight: 1 }}>{customer.rfv_score}</div>
                <div style={{ marginTop: '0.375rem' }}>
                  <div style={{ width: 64, height: 6, backgroundColor: 'rgba(124,92,252,0.2)', borderRadius: 3, margin: '0 auto' }}>
                    <div style={{ width: `${customer.rfv_score}%`, height: 6, backgroundColor: 'var(--violet)', borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {[
              { label: 'Lifetime value',  value: `$${Number(customer.lifetime_value || 0).toFixed(0)}` },
              { label: 'Total orders',    value: (customer.total_orders || 0).toString() },
              { label: 'Last purchase',   value: lastPurchase },
              { label: 'Customer since',  value: joined },
            ].map(stat => (
              <div key={stat.label} style={{ backgroundColor: 'rgba(21,21,31,0.03)', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>{stat.label}</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.25rem', fontWeight: 800 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>

          {/* Order history */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
              Order history {orders && orders.length > 0 ? `· ${orders.length} orders` : ''}
            </h2>
            {orders && orders.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {orders.map((order, i) => (
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                      ${Number(order.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No orders found.</p>
            )}
          </div>

          {/* Campaign history */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
              Campaign history
            </h2>
            {campaignSends && campaignSends.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {campaignSends.map((send: any) => {
                  const campaign = send.campaigns
                  const converted = !!send.converted_at
                  return (
                    <div key={send.id} style={{ padding: '0.75rem', backgroundColor: 'rgba(21,21,31,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1 }}>
                          {campaign?.name || 'Campaign'}
                        </div>
                        {send.is_control_group ? (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(21,21,31,0.05)', padding: '0.15rem 0.45rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>control</span>
                        ) : converted ? (
                          <span style={{ fontSize: '0.7rem', color: '#15803d', backgroundColor: 'rgba(74,222,128,0.1)', padding: '0.15rem 0.45rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>converted ✓</span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', backgroundColor: 'rgba(21,21,31,0.05)', padding: '0.15rem 0.45rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>sent</span>
                        )}
                      </div>
                      {campaign?.subject && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>"{campaign.subject}"</div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.375rem' }}>
                        {send.sent_at ? new Date(send.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        {converted && send.conversion_value && (
                          <span style={{ color: '#15803d', fontWeight: 600, marginLeft: '0.5rem' }}>· ${Number(send.conversion_value).toFixed(2)} order</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {customer.control_group
                  ? 'This customer is in the control group — they are not sent campaigns so Yara can measure lift.'
                  : 'No campaigns sent to this customer yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
