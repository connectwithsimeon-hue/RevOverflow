'use client'

import Link from 'next/link'

interface Step {
  number: number
  label: string
  description: string
  done: boolean
  action?: { label: string; href: string }
}

interface Props {
  isConnected: boolean
  hasSynced: boolean
  hasCampaign: boolean
  modeA?: boolean
  hasVipSetup?: boolean
  reachable?: number
}

export default function OnboardingBanner({
  isConnected,
  hasSynced,
  hasCampaign,
  modeA = false,
  hasVipSetup = false,
  reachable = 0,
}: Props) {
  // Mode A: standard 3-step flow (Connect → Score → Campaign)
  const modeASteps: Step[] = [
    {
      number: 1,
      label: 'Connect your POS',
      description: 'Link your Square account so Yara can read your customers and orders.',
      done: isConnected,
      action: !isConnected ? { label: 'Connect your POS →', href: '/api/square/connect' } : undefined,
    },
    {
      number: 2,
      label: 'Let Yara score your customers',
      description: 'Yara ranks every customer by Recency, Frequency & Value — takes about 60 seconds.',
      done: hasSynced,
      action: isConnected && !hasSynced ? { label: 'Refresh dashboard', href: '/dashboard' } : undefined,
    },
    {
      number: 3,
      label: 'Launch your first win-back campaign',
      description: 'Send a personalised message to at-risk and lapsed customers. Yara tracks who comes back.',
      done: hasCampaign,
      action: hasSynced && !hasCampaign ? { label: 'Launch campaign →', href: '/campaigns' } : undefined,
    },
  ]

  // Mode B: grow-your-list flow (Connect → VIP page → Reach 1,000)
  const modeBSteps: Step[] = [
    {
      number: 1,
      label: 'Connect your POS',
      description: 'Link your Square account so Yara can import any existing customers.',
      done: isConnected,
      action: !isConnected ? { label: 'Connect your POS →', href: '/api/square/connect' } : undefined,
    },
    {
      number: 2,
      label: 'Set up your VIP signup page',
      description: 'Yara generates a QR code for your counter. Customers scan it to join your list.',
      done: hasVipSetup,
      action: isConnected && !hasVipSetup ? { label: 'Get your QR code →', href: '/account#vip' } : undefined,
    },
    {
      number: 3,
      label: 'Grow to 1,000 reachable customers',
      description: `You have ${reachable.toLocaleString()} so far. Reach 1,000 to unlock Mode A — Revenue Activation and Yara's full power.`,
      done: reachable >= 1000,
      action: hasVipSetup && reachable < 1000 ? { label: 'View VIP page →', href: '/account#vip' } : undefined,
    },
  ]

  const steps = modeA ? modeASteps : modeBSteps

  // All steps done — hide banner
  if (steps.every(s => s.done)) return null

  const completedCount = steps.filter(s => s.done).length
  const progressPct = Math.round((completedCount / steps.length) * 100)

  return (
    <div style={{ backgroundColor: 'rgba(124,92,252,0.07)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1rem', fontWeight: 800, marginBottom: '0.2rem' }}>
            ✦ {modeA ? 'Get your first campaign live' : 'Build your reachable base'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
            {completedCount} of {steps.length} steps complete
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '120px', height: '6px', backgroundColor: 'rgba(124,92,252,0.2)', borderRadius: '100px', overflow: 'hidden' }}>
            <div style={{ width: `${progressPct}%`, height: '100%', backgroundColor: 'var(--violet)', borderRadius: '100px', transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--violet)' }}>{progressPct}%</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {steps.map((step, i) => {
          const isNext = !step.done && steps.slice(0, i).every(s => s.done)
          return (
            <div
              key={step.number}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
                padding: '0.875rem 1rem',
                backgroundColor: step.done ? 'rgba(74,222,128,0.05)' : isNext ? 'rgba(124,92,252,0.08)' : 'transparent',
                border: step.done ? '1px solid rgba(74,222,128,0.2)' : isNext ? '1px solid rgba(124,92,252,0.3)' : '1px solid transparent',
                borderRadius: '10px',
                opacity: !step.done && !isNext ? 0.5 : 1,
              }}
            >
              {/* Step indicator */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: step.done ? '#4ade80' : isNext ? 'var(--violet)' : 'rgba(21,21,31,0.1)',
                color: step.done || isNext ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.8125rem', fontWeight: 800,
              }}>
                {step.done ? '✓' : step.number}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.2rem', color: step.done ? '#4ade80' : 'var(--text-primary)' }}>
                  {step.label}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
                  {step.description}
                </div>
                {step.action && isNext && (
                  <Link
                    href={step.action.href}
                    style={{ display: 'inline-block', marginTop: '0.625rem', backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '8px', fontWeight: 700, padding: '0.5rem 1rem', fontSize: '0.875rem', textDecoration: 'none' }}
                  >
                    {step.action.label}
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
