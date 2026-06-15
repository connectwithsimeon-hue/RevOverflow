'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SEGMENT_META: Record<string, { label: string; color: string }> = {
  at_risk: { label: 'At Risk',  color: '#fbbf24' },
  lapsed:  { label: 'Lapsed',  color: '#fb923c' },
}

function defaultSubject() {
  return `{{first_name}}, we miss you at {{business_name}}`
}

function defaultBody(businessName: string) {
  return `<!DOCTYPE html>
<html>
<body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #0f0f17; color: #f0f0f8; margin: 0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #181924; border-radius: 16px; padding: 40px; border: 1px solid rgba(124,92,252,0.2);">
    <div style="font-size: 1.5rem; font-weight: 800; margin-bottom: 8px; color: #f0f0f8;">
      Hey {{first_name}} 👋
    </div>
    <p style="color: #9899b0; line-height: 1.7; margin: 0 0 24px;">
      We noticed it's been a while since you last visited <strong style="color: #f0f0f8;">{{business_name}}</strong>.
      We'd love to see you back — you're one of our favourites.
    </p>
    <div style="background: rgba(124,92,252,0.12); border: 1px solid rgba(124,92,252,0.3); border-radius: 12px; padding: 20px; margin-bottom: 28px; text-align: center;">
      <div style="font-size: 0.8rem; color: #9899b0; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">Special offer — just for you</div>
      <div style="font-size: 1.25rem; font-weight: 700; color: #a78bfa;">Come back and save 15%</div>
      <div style="font-size: 0.85rem; color: #9899b0; margin-top: 4px;">Use code WELCOME BACK at checkout</div>
    </div>
    <p style="color: #9899b0; line-height: 1.7; margin: 0 0 28px; font-size: 0.9375rem;">
      We've missed having you around. Stop by when you're ready — we'll be here.
    </p>
    <div style="color: #6b6c80; font-size: 0.8125rem; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; margin-top: 8px;">
      Sent by Yara · Revenue AI for {{business_name}}
    </div>
  </div>
</body>
</html>`
}

interface EligibleCustomer {
  id: string
  name: string
  email: string
  segment: string
  last_purchase_at: string | null
  lifetime_value: number
  control_group: boolean
}

interface Attribution {
  sentCount: number
  controlCount: number
  sentConverted: number
  controlConverted: number
  sentRate: number
  controlRate: number
  lift: number | null
  sentRevenue: number
  attributedRevenue: number
}

interface PastCampaign {
  id: string
  name: string
  status: string
  total_sent: number
  total_control: number
  attribution: Attribution | null
  sent_at: string | null
  created_at: string
  segment_targets: string[]
}

export default function CampaignsPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<EligibleCustomer[]>([])
  const [pastCampaigns, setPastCampaigns] = useState<PastCampaign[]>([])
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)

  const [campaignName, setCampaignName] = useState('Win-back — At Risk & Lapsed')
  const [subject, setSubject] = useState(defaultSubject())
  const [bodyHtml, setBodyHtml] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ totalSent: number; totalControl: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/campaigns/eligible')
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()
      setCustomers(data.customers || [])
      setPastCampaigns(data.pastCampaigns || [])
      setBusinessName(data.businessName || '')
      setBodyHtml(defaultBody(data.businessName || 'us'))
      setLoading(false)
    }
    load()
  }, [router])

  const atRisk = customers.filter(c => c.segment === 'at_risk')
  const lapsed  = customers.filter(c => c.segment === 'lapsed')
  const willSend = customers.filter(c => !c.control_group)
  const control  = customers.filter(c => c.control_group)

  async function handleSend() {
    setSending(true)
    setError('')
    try {
      // Create campaign
      const createRes = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          segmentTargets: ['at_risk', 'lapsed'],
          subject,
          bodyHtml,
        }),
      })
      const createData = await createRes.json()
      if (!createData.campaignId) throw new Error(createData.error || 'Failed to create campaign')

      // Send
      const sendRes = await fetch(`/api/campaigns/${createData.campaignId}/send`, {
        method: 'POST',
      })
      const sendData = await sendRes.json()

      // Credit gate — not enough credits
      if (sendData.error === 'insufficient_credits') {
        setError(`Not enough Yara credits. You have ${sendData.creditsAvailable} credits but need at least 2. Go to Pricing to buy more.`)
        setSending(false)
        return
      }

      if (!sendData.ok) throw new Error(sendData.error || 'Failed to send')

      if (sendData.sendErrors?.length > 0) {
        console.error('Send errors:', sendData.sendErrors)
        setError(`Sent ${sendData.totalSent}, but ${sendData.sendErrors.length} failed: ${sendData.sendErrors[0]?.error}`)
      }
      setResult({ totalSent: sendData.totalSent, totalControl: sendData.totalControl })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.125rem' }}>
            Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
          </span>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>← Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.375rem' }}>
            Win-back Campaign
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Yara has identified {customers.length} customers to win back. {control.length} are in the control group and won't receive the email.
          </p>
        </div>

        {result ? (
          /* Success state */
          <div style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', maxWidth: '520px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.5rem' }}>Campaign sent!</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              <strong style={{ color: '#4ade80' }}>{result.totalSent} emails sent</strong> · {result.totalControl} held as control group
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Yara will track who comes back and attribute revenue automatically.
            </p>
            <Link href="/dashboard" style={{ display: 'inline-block', marginTop: '1.5rem', backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.75rem 1.75rem', textDecoration: 'none', fontSize: '0.9375rem' }}>
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="grid gap-8" style={{ gridTemplateColumns: '1fr 1fr' }}>

            {/* Left — audience + settings */}
            <div className="flex flex-col gap-6">

              {/* Audience summary */}
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Audience</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: 'At Risk',      count: atRisk.length,  color: '#fbbf24' },
                    { label: 'Lapsed',       count: lapsed.length,  color: '#fb923c' },
                    { label: 'Will receive', count: willSend.length, color: '#4ade80' },
                    { label: 'Control',      count: control.length,  color: '#9899b0' },
                  ].map(s => (
                    <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.875rem' }}>
                      <div style={{ color: s.color, fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>{s.label}</div>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800 }}>{s.count}</div>
                    </div>
                  ))}
                </div>

                {/* Customer list */}
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {customers.map(c => (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.email}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', color: SEGMENT_META[c.segment]?.color, fontWeight: 600 }}>
                          {SEGMENT_META[c.segment]?.label}
                        </span>
                        {c.control_group && (
                          <span style={{ fontSize: '0.7rem', color: '#6b6c80', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>control</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campaign settings */}
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem' }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Settings</h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>Campaign name</label>
                    <input
                      value={campaignName}
                      onChange={e => setCampaignName(e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.625rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.9375rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                      Subject line <span style={{ color: '#6b6c80' }}>· use {'{{first_name}}'} and {'{{business_name}}'}</span>
                    </label>
                    <input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.625rem 0.875rem', color: 'var(--text-primary)', fontSize: '0.9375rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right — email preview + send */}
            <div className="flex flex-col gap-6">
              <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem', flex: 1 }}>
                <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Email preview</h2>
                <div style={{ background: '#0f0f17', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
                  <iframe
                    srcDoc={bodyHtml.replace(/\{\{first_name\}\}/g, 'Maria').replace(/\{\{business_name\}\}/g, businessName || 'Your Business')}
                    style={{ width: '100%', height: '360px', border: 'none' }}
                    title="Email preview"
                  />
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Preview shown as it will appear to Maria. All {'{{first_name}}'} and {'{{business_name}}'} tags are personalised per recipient.
                </p>

                {error && (
                  <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', color: '#f87171', fontSize: '0.875rem' }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={sending || customers.length === 0}
                  style={{
                    width: '100%',
                    backgroundColor: sending ? 'rgba(124,92,252,0.5)' : 'var(--violet)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    padding: '0.875rem',
                    fontSize: '1rem',
                    cursor: sending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {sending ? 'Sending…' : `Send to ${willSend.length} customers`}
                </button>
              </div>

              {/* Past campaigns with attribution */}
              {pastCampaigns.length > 0 && (
                <div className="flex flex-col gap-4">
                  <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', fontWeight: 700 }}>Past campaigns</h2>
                  {pastCampaigns.map(p => (
                    <div key={p.id} style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: p.attribution ? '1rem' : 0 }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {p.sent_at ? new Date(p.sent_at).toLocaleDateString() : 'Draft'} · {p.total_sent} sent · {p.total_control} control
                          </div>
                        </div>
                        {p.attribution?.lift !== null && p.attribution?.lift !== undefined && (
                          <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', padding: '0.375rem 0.75rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 600 }}>LIFT</div>
                            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.125rem', fontWeight: 800, color: '#4ade80' }}>+{p.attribution.lift}%</div>
                          </div>
                        )}
                      </div>

                      {p.attribution && (p.attribution.sentConverted > 0 || p.attribution.controlConverted > 0) ? (
                        <div className="grid grid-cols-2 gap-3">
                          {/* Sent group */}
                          <div style={{ background: 'rgba(124,92,252,0.07)', border: '1px solid rgba(124,92,252,0.2)', borderRadius: '10px', padding: '0.875rem' }}>
                            <div style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Received email</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Converted</span>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{p.attribution.sentConverted}/{p.attribution.sentCount} ({p.attribution.sentRate}%)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Revenue</span>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>${p.attribution.sentRevenue.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Attributed to Yara</span>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#4ade80' }}>${p.attribution.attributedRevenue.toLocaleString()}</span>
                            </div>
                          </div>

                          {/* Control group */}
                          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.875rem' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Control group</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Converted</span>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{p.attribution.controlConverted}/{p.attribution.controlCount} ({p.attribution.controlRate}%)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Revenue</span>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                                ${pastCampaigns.find(c => c.id === p.id)?.attribution?.controlConverted ? '—' : '—'}
                              </span>
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              Bought without any nudge from Yara
                            </div>
                          </div>
                        </div>
                      ) : p.attribution ? (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          No conversions detected yet — Yara checks automatically as new orders come in.
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
