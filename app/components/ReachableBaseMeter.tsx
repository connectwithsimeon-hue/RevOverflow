/**
 * ReachableBaseMeter
 * Shows a merchant's progress toward Mode A (1,000 reachable customers).
 * Mode A merchants see a "Revenue Activation" badge instead of the progress bar.
 */

interface Props {
  reachable: number
  total: number
  modeA: boolean
}

const TARGET = 1000

export default function ReachableBaseMeter({ reachable, total, modeA }: Props) {
  const pct = Math.min(100, Math.round((reachable / TARGET) * 100))
  const remaining = Math.max(0, TARGET - reachable)

  if (modeA) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'rgba(74,222,128,0.06)',
        border: '1px solid rgba(74,222,128,0.2)',
        borderRadius: '12px', padding: '0.875rem 1.25rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '10px',
          background: 'rgba(74,222,128,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.125rem', flexShrink: 0,
        }}>
          ⚡
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#4ade80', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Mode A — Revenue Activation
            </span>
          </div>
          <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)' }}>
            {reachable.toLocaleString()} reachable customers · Yara is running automatically
          </span>
        </div>
        <div style={{
          background: 'rgba(74,222,128,0.15)',
          color: '#4ade80',
          border: '1px solid rgba(74,222,128,0.3)',
          borderRadius: '6px', padding: '0.25rem 0.625rem',
          fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap',
        }}>
          ACTIVE
        </div>
      </div>
    )
  }

  // Mode B — show progress bar toward 1,000
  return (
    <div style={{
      background: 'rgba(124,92,252,0.06)',
      border: '1px solid rgba(124,92,252,0.2)',
      borderRadius: '12px', padding: '1rem 1.25rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
              Reachable Base
            </span>
            <span style={{
              background: 'rgba(124,92,252,0.2)',
              color: '#a78bfa',
              border: '1px solid rgba(124,92,252,0.3)',
              borderRadius: '6px', padding: '0.125rem 0.5rem',
              fontSize: '0.6875rem', fontWeight: 700,
            }}>
              Mode B
            </span>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            {remaining.toLocaleString()} more to unlock Mode A — Revenue Activation
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a78bfa', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {reachable.toLocaleString()}
          </span>
          <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.35)', marginLeft: '0.25rem' }}>
            / {TARGET.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', overflow: 'hidden', marginBottom: '0.625rem' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'linear-gradient(90deg, #7C5CFC 0%, #a78bfa 100%)',
          borderRadius: '100px',
          transition: 'width 0.5s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
          {total.toLocaleString()} total customers · {pct}% reachable
        </span>
        <a
          href="/dashboard?tab=vip"
          style={{
            fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa',
            textDecoration: 'none',
          }}
        >
          Get VIP QR code →
        </a>
      </div>
    </div>
  )
}
