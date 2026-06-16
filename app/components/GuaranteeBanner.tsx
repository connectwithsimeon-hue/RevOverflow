/**
 * GuaranteeBanner
 * Shown on the dashboard when a merchant is in the 3× ROI guarantee window.
 *
 * States:
 *  - "on track"   → green "You're on track for your 3× ROI guarantee"
 *  - "at risk"    → yellow warning with days remaining
 *  - "guaranteed" → red "You qualify for a refund review" + contact link
 */

interface Props {
  eligible: boolean
  daysSinceStart: number
  revenueRecovered: number
  targetRevenue: number
  roiMultiple: number
  onTrack: boolean
  atRisk: boolean
  guaranteed: boolean
  daysRemaining: number
  planCost: number
}

export default function GuaranteeBanner(p: Props) {
  if (!p.eligible) return null
  if (p.daysSinceStart < 7) return null   // Don't show in first week

  const pct = Math.min(100, Math.round((p.revenueRecovered / p.targetRevenue) * 100))
  const roiLabel = p.roiMultiple.toFixed(1)

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

  if (p.guaranteed) {
    return (
      <div style={{
        background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.3)',
        borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
        display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap',
      }}>
        <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>🛡️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#f87171', marginBottom: '0.375rem', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Guarantee Review — You Qualify for a Refund
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
            After 60 days, Yara recovered {fmt(p.revenueRecovered)} ({roiLabel}× your plan cost).
            Our guarantee promised 3×. Email us and we will make it right.
          </p>
          <a
            href="mailto:support@revoverflow.com?subject=Guarantee Review Request"
            style={{
              display: 'inline-block', background: '#f87171', color: '#fff',
              borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: 700,
              fontSize: '0.875rem', textDecoration: 'none',
            }}
          >
            Request refund review →
          </a>
        </div>
      </div>
    )
  }

  if (p.atRisk) {
    return (
      <div style={{
        background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.25)',
        borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.25rem' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#fbbf24', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Guarantee at risk — {p.daysRemaining} days left
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>
              {fmt(p.revenueRecovered)} recovered · need {fmt(p.targetRevenue)} for 3× guarantee
            </div>
          </div>
        </div>
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#fbbf24', borderRadius: '100px' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>{pct}% of target</span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>Day {p.daysSinceStart} of 60</span>
        </div>
      </div>
    )
  }

  // On track
  return (
    <div style={{
      background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)',
      borderRadius: '14px', padding: '1rem 1.5rem', marginBottom: '1.5rem',
      display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: '1.25rem' }}>🛡️</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#4ade80' }}>
          On track for your 3× ROI guarantee
        </div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8125rem' }}>
          {fmt(p.revenueRecovered)} recovered so far · {roiLabel}× · {p.daysRemaining > 0 ? `${p.daysRemaining} days remaining` : 'Guarantee window complete'}
        </div>
      </div>
      <div style={{ height: '6px', width: '120px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#4ade80', borderRadius: '100px' }} />
      </div>
    </div>
  )
}
