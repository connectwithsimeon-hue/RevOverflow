import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ReferralLinkWidget from '@/app/components/ReferralLinkWidget'
import AdSyncWidget from '@/app/components/AdSyncWidget'
import DashboardSidebar from '@/app/components/DashboardSidebar'

const PLAN_META: Record<string, { label: string; price: number; credits: number; color: string; features: string[] }> = {
  capture: { label: 'Capture', price: 147,  credits: 500,   color: '#60a5fa', features: ['Customer scoring (RFV)', 'Segmentation', '500 Yara credits/mo', 'Square POS'] },
  core:    { label: 'Core',    price: 397,  credits: 2000,  color: '#4ade80', features: ['Everything in Capture', 'Win-back campaigns', 'Revenue attribution', '2,000 Yara credits/mo'] },
  brain:   { label: 'Brain',   price: 697,  credits: 5000,  color: '#a78bfa', features: ['Everything in Core', 'Autonomous Yara Autopilot', 'Multi-POS connectors', '5,000 Yara credits/mo'] },
  empire:  { label: 'Empire',  price: 1497, credits: 15000, color: '#f59e0b', features: ['Everything in Brain', 'White-glove onboarding', 'Unlimited POS', '15,000 Yara credits/mo'] },
}

const ACTION_LABELS: Record<string, string> = {
  plan_grant:    'Monthly plan credits',
  plan_renewal:  'Monthly renewal',
  pack_purchase: 'Credit pack purchase',
  email_sent:    'Emails sent',
  sms_sent:      'SMS sent',
  decision:      'AI decision',
  analysis:      'Analysis',
  extra_pos:     'Extra POS connector',
  reply_handled: 'Reply handled',
  import_100:    'Customer import',
}

export default async function AccountPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('*, vip_slug, referral_token')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) redirect('/login')

  const { data: ledger } = await service
    .from('credit_ledger')
    .select('*')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const plan = PLAN_META[merchant.plan || 'capture'] || PLAN_META['capture']
  const isAutopilotPlan = ['brain', 'empire'].includes(merchant.plan || '')

  const initials = (merchant.business_name || 'R')
    .split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join('')

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex' }}>
      <DashboardSidebar active="account" plan={merchant.plan} />

      <main style={{ flex: 1, minWidth: 0 }}>
        {/* ── Topbar ────────────────────────────────────────────────────── */}
        <div style={{
          height: 72, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40,
          backgroundColor: 'rgba(13,13,17,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Account</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.0625rem' }}>
              Account &amp; Settings
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ backgroundColor: 'rgba(124,92,252,0.15)', color: 'var(--violet)', border: '1px solid rgba(124,92,252,0.35)', borderRadius: '100px', padding: '0.25rem 0.75rem', fontSize: '0.8125rem', fontWeight: 700, textTransform: 'capitalize' }}>
              {merchant.plan || 'free'} plan
            </span>
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

      <div className="max-w-4xl px-8 py-8">
        <div className="mb-8">
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.375rem' }}>
            Account & Settings
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Manage your plan, credits, and Yara configuration.
          </p>
        </div>

        <div className="flex flex-col gap-6">

          {/* ── Plan & Billing ── */}
          <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Plan & Billing
            </h2>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800 }}>
                    {plan.label}
                  </span>
                  <span style={{ backgroundColor: `${plan.color}20`, color: plan.color, border: `1px solid ${plan.color}40`, borderRadius: '100px', padding: '0.2rem 0.6rem', fontSize: '0.8125rem', fontWeight: 700 }}>
                    {merchant.subscription_status === 'active' ? 'Active' : merchant.subscription_status || 'Inactive'}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
                  ${plan.price.toLocaleString()}/month · renews automatically
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: plan.color }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2" style={{ minWidth: '160px' }}>
                <Link href="/pricing" style={{ display: 'block', backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.75rem 1.25rem', fontSize: '0.9375rem', textDecoration: 'none', textAlign: 'center' }}>
                  Upgrade plan
                </Link>
                {merchant.stripe_customer_id && (
                  <a
                    href={`https://billing.stripe.com/p/login/test_00000`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 500, padding: '0.75rem 1.25rem', fontSize: '0.875rem', textDecoration: 'none', textAlign: 'center' }}
                  >
                    Manage billing
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* ── Yara Credits ── */}
          <section style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '16px', padding: '1.75rem' }}>
            <div className="flex items-center justify-between mb-1">
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700 }}>
                Yara Credits
              </h2>
              <Link href="/pricing" style={{ fontSize: '0.875rem', color: 'var(--violet)', fontWeight: 600, textDecoration: 'none' }}>
                Buy more →
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 mb-6" style={{ marginTop: '1.25rem' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>Current balance</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.5rem', fontWeight: 800, color: 'var(--violet)', lineHeight: 1 }}>
                  {(merchant.credit_balance ?? 0).toLocaleString()}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>credits remaining</div>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '1.5rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.25rem' }}>Included per month</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>
                  {(merchant.credits_included ?? plan.credits).toLocaleString()}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>on {plan.label} plan</div>
              </div>
            </div>

            {/* Credit cost reference */}
            <div style={{ backgroundColor: 'rgba(124,92,252,0.06)', border: '1px solid rgba(124,92,252,0.15)', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.625rem' }}>Credit costs</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.4rem' }}>
                {[
                  { label: 'Email sent', cost: 2 },
                  { label: 'SMS sent', cost: 5 },
                  { label: 'AI decision', cost: 1 },
                  { label: 'Analysis', cost: 10 },
                  { label: 'Reply handled', cost: 3 },
                  { label: 'Extra POS connector', cost: 50 },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--violet)' }}>{item.cost} cr</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction history */}
            {ledger && ledger.length > 0 ? (
              <>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.75rem' }}>
                  Recent transactions
                </h3>
                <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {['Date', 'Description', 'Credits', 'Balance'].map(h => (
                          <th key={h} style={{ padding: '0.625rem 0.875rem', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((row: any, i: number) => {
                        const isPositive = row.amount > 0
                        const date = new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        return (
                          <tr key={row.id} style={{ borderBottom: i < ledger.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <td style={{ padding: '0.75rem 0.875rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{date}</td>
                            <td style={{ padding: '0.75rem 0.875rem', fontSize: '0.875rem' }}>
                              {row.description || ACTION_LABELS[row.action] || row.action}
                            </td>
                            <td style={{ padding: '0.75rem 0.875rem', fontWeight: 700, fontSize: '0.9375rem', color: isPositive ? '#4ade80' : '#f87171', whiteSpace: 'nowrap' }}>
                              {isPositive ? '+' : ''}{row.amount.toLocaleString()}
                            </td>
                            <td style={{ padding: '0.75rem 0.875rem', color: 'var(--text-secondary)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                              {row.balance_after?.toLocaleString() ?? '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No transactions yet.</p>
            )}
          </section>

          {/* ── Autopilot Settings ── */}
          <section style={{ backgroundColor: 'var(--surface)', border: isAutopilotPlan ? '1px solid rgba(124,92,252,0.3)' : '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
            <div className="flex items-center gap-3 mb-1">
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700 }}>
                ✦ Yara Autopilot
              </h2>
              {isAutopilotPlan && (
                <span style={{ backgroundColor: merchant.auto_campaigns_enabled ? 'rgba(124,92,252,0.15)' : 'rgba(100,100,100,0.15)', color: merchant.auto_campaigns_enabled ? 'var(--violet)' : 'var(--text-secondary)', borderRadius: '100px', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 700 }}>
                  {merchant.auto_campaigns_enabled ? 'ON' : 'OFF'}
                </span>
              )}
            </div>

            {!isAutopilotPlan ? (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.7, marginBottom: '1rem' }}>
                  Yara Autopilot runs every morning and automatically sends win-back emails to at-risk and lapsed customers — no manual campaigns needed.
                </p>
                <Link href="/pricing" style={{ display: 'inline-block', backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.75rem 1.5rem', fontSize: '0.9375rem', textDecoration: 'none' }}>
                  Upgrade to Brain to unlock →
                </Link>
              </div>
            ) : (
              <form action={async (formData: FormData) => {
                'use server'
                const { createServiceClient: sc } = await import('@/lib/supabase/server')
                const s = sc()
                const enabled = formData.get('autopilot_enabled') === 'on'
                const subject = (formData.get('subject') as string || '').trim()
                await s.from('merchants').update({
                  auto_campaigns_enabled: enabled,
                  auto_campaign_subject: subject || 'We miss you at {{business_name}} — come back for something special',
                  updated_at: new Date().toISOString(),
                }).eq('id', merchant.id)
                const { redirect: r } = await import('next/navigation')
                r('/account?saved=autopilot')
              }} style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="autopilot_enabled"
                        defaultChecked={!!merchant.auto_campaigns_enabled}
                        style={{ width: 18, height: 18, accentColor: 'var(--violet)', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
                        Run daily at 9am UTC — email at-risk &amp; lapsed customers automatically
                      </span>
                    </label>
                  </div>

                  {/* Subject line */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Win-back email subject line
                    </label>
                    <input
                      type="text"
                      name="subject"
                      defaultValue={merchant.auto_campaign_subject || 'We miss you at {{business_name}} — come back for something special'}
                      placeholder="We miss you at {{business_name}}…"
                      style={{ width: '100%', backgroundColor: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.9375rem', color: 'var(--text-primary)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.375rem' }}>
                      Use <code style={{ backgroundColor: 'rgba(124,92,252,0.1)', color: 'var(--violet)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>{'{{business_name}}'}</code> and <code style={{ backgroundColor: 'rgba(124,92,252,0.1)', color: 'var(--violet)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>{'{{first_name}}'}</code> as placeholders.
                    </p>
                  </div>

                  <div>
                    <button type="submit" style={{ backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.75rem 1.5rem', fontSize: '0.9375rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Save autopilot settings
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>

          {/* ── VIP Signup Page + QR Code ── */}
          <section id="vip" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              ✦ VIP Signup Page
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Print this QR code and put it at your counter. Customers scan it to join your VIP list — Yara captures them automatically.
            </p>
            {merchant.vip_slug ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.875rem 1rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Your VIP page URL</div>
                  <div style={{ fontSize: '0.9375rem', color: 'var(--violet)', wordBreak: 'break-all' }}>
                    {`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://revoverflow.com'}/vip/${merchant.vip_slug}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <a
                    href="/api/vip/qr?format=png"
                    download
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--violet)', color: '#fff', borderRadius: '10px', padding: '0.75rem 1.25rem', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' }}
                  >
                    ⬇ Download QR (PNG)
                  </a>
                  <a
                    href="/api/vip/qr?format=svg"
                    download
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1.25rem', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' }}
                  >
                    ⬇ Download QR (SVG)
                  </a>
                  <a
                    href={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://revoverflow.com'}/vip/${merchant.vip_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1.25rem', fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' }}
                  >
                    Preview page ↗
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(124,92,252,0.07)', border: '1px solid rgba(124,92,252,0.2)', borderRadius: '10px', padding: '1rem 1.25rem' }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
                  Your VIP page will be generated automatically the first time you visit{' '}
                  <a href="/api/vip/qr" style={{ color: 'var(--violet)' }}>/api/vip/qr</a>.
                </p>
                <a href="/api/vip/qr" style={{ display: 'inline-block', background: 'var(--violet)', color: '#fff', borderRadius: '8px', padding: '0.625rem 1.25rem', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                  Generate my QR code
                </a>
              </div>
            )}
          </section>

          {/* ── Referral Link ── */}
          <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              🎁 Referral Link
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Share this link with your best customers so they can invite friends. Every referral is tracked and attributed back to them.
            </p>
            <ReferralLinkWidget merchantId={merchant.id} referralToken={merchant.referral_token} vipSlug={merchant.vip_slug} />
          </section>

          {/* ── Ad Audience Sync ── */}
          <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              📣 Ad Audience Sync
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
              Yara keeps a Facebook suppression + lookalike audience and a Google Ads suppression list in sync with your customer base —
              so you stop paying to "acquire" people who already buy from you, and start finding more people like your best customers.
              One-time setup: in Facebook Business Settings → Partners, add RevOverflow as a partner with Ads access on your ad account.
              In Google Ads → Access and security, grant RevOverflow's manager account access. Then paste your account IDs below.
            </p>

            <form action={async (formData: FormData) => {
              'use server'
              const { createServiceClient: sc, createClient: cc } = await import('@/lib/supabase/server')
              const sb = cc()
              const { data: { user: u } } = await sb.auth.getUser()
              if (!u) return
              const s = sc()
              const { data: m } = await s.from('merchants').select('id').eq('auth_user_id', u.id).single()
              if (!m) return
              const metaId = (formData.get('meta_ad_account_id') as string || '').replace(/[^\d]/g, '')
              const googleId = (formData.get('google_ads_customer_id') as string || '').replace(/[^\d]/g, '')
              await s.from('merchants').update({
                meta_ad_account_id: metaId || null,
                google_ads_customer_id: googleId || null,
              }).eq('id', m.id)
              const { redirect: r } = await import('next/navigation')
              r('/account?saved=ads')
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Facebook Ad Account ID
                  </label>
                  <input
                    type="text"
                    name="meta_ad_account_id"
                    defaultValue={merchant.meta_ad_account_id || ''}
                    placeholder="123456789012345"
                    style={{ width: '100%', backgroundColor: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.9375rem', color: 'var(--text-primary)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Google Ads Customer ID
                  </label>
                  <input
                    type="text"
                    name="google_ads_customer_id"
                    defaultValue={merchant.google_ads_customer_id || ''}
                    placeholder="123-456-7890"
                    style={{ width: '100%', backgroundColor: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.9375rem', color: 'var(--text-primary)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '1.25rem' }}>
                <button type="submit" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 600, padding: '0.75rem 1.5rem', fontSize: '0.9375rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Save account IDs
                </button>
              </div>
            </form>

            <AdSyncWidget />
          </section>

          {/* ── Account Info ── */}
          <section style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Account Info
            </h2>
            <form action={async (formData: FormData) => {
              'use server'
              const { createServiceClient: sc } = await import('@/lib/supabase/server')
              const s = sc()
              const { createClient: cc } = await import('@/lib/supabase/server')
              const sb = cc()
              const { data: { user: u } } = await sb.auth.getUser()
              if (!u) return
              const businessName = (formData.get('business_name') as string || '').trim()
              if (businessName) {
                await s.from('merchants').update({ business_name: businessName, updated_at: new Date().toISOString() }).eq('auth_user_id', u.id)
              }
              const { redirect: r } = await import('next/navigation')
              r('/account?saved=account')
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Business name
                  </label>
                  <input
                    type="text"
                    name="business_name"
                    defaultValue={merchant.business_name || ''}
                    style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.9375rem', color: 'var(--text-primary)', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Email address
                  </label>
                  <div style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', padding: '0.75rem 0' }}>
                    {user.email}
                  </div>
                </div>
                <div>
                  <button type="submit" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 600, padding: '0.75rem 1.5rem', fontSize: '0.9375rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Save changes
                  </button>
                </div>
              </div>
            </form>
          </section>

        </div>
      </div>
      </main>
    </div>
  )
}
