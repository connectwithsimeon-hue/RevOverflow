/**
 * ReachableBaseMeter
 * Compact vertical card showing a merchant's progress toward Mode A (1,000 reachable customers).
 * Mode A merchants see a "Revenue Activation" active-state card instead of the progress bar.
 * Designed to sit alongside the KPI card grid in the dashboard's top "two boards" section.
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
        background: 'linear-gradient(160deg, rgba(74,222,128,0.12) 0%, var(--surface) 65%)',
        border: '1px solid rgba(74,222,128,0.25)',
        borderRadius: '18px', padding: '1.375rem',
        boxShadow: '0 6px 20px -10px rgba(16,24,40,0.12)',
        height: '100%', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: '12px',
          background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.125rem', marginBottom: '0.875rem',
          boxShadow: '0 4px 14px -4px rgba(74,222,128,0.35)',
        }}>
          ⚡
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>
          Reachable Audience
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.625rem' }}>
          {reachable.toLocaleString()}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          background: 'rgba(74,222,128,0.15)', color: '#15803d',
          border: '1px solid rgba(74,222,128,0.3)',
          borderRadius: '100px', padding: '0.2rem 0.625rem',
          fontSize: '0.7rem', fontWeight: 700, width: 'fit-content',
        }}>
          ● Mode A Active
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.5, marginTop: '0.75rem', marginBottom: 0 }}>
          Yara is running automatically across your full base.
        </p>
      </div>
    )
  }

  // Mode B — compact progress card
  return (
    <div style={{
      background: 'linear-gradient(160deg, rgba(124,92,252,0.12) 0%, var(--surface) 65%)',
      border: '1px solid rgba(124,92,252,0.25)',
      borderRadius: '18px', padding: '1.375rem',
      boxShadow: '0 6px 20px -10px rgba(16,24,40,0.12)',
      height: '100%', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: '12px',
        background: 'linear-gradient(135deg, #7C5CFC 0%, #a78bfa 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.125rem', marginBottom: '0.875rem',
        boxShadow: '0 4px 14px -4px rgba(124,92,252,0.35)',
      }}>
        📈
      </div>

      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>
        Reachable Audience
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginBottom: '0.75rem' }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, color: 'var(--violet)' }}>
          {reachable.toLocaleString()}
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>/ {TARGET.toLocaleString()}</span>
      </div>

      <div style={{ height: '8px', background: 'rgba(21,21,31,0.08)', borderRadius: '100px', overflow: 'hidden', marginBottom: '0.625rem' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'linear-gradient(90deg, #7C5CFC 0%, #a78bfa 100%)',
          borderRadius: '100px',
          transition: 'width 0.5s ease',
        }} />
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', margin: 0 }}>
        {remaining.toLocaleString()} more to unlock Mode A · {total.toLocaleString()} total
      </p>

      <a
        href="/dashboard?tab=vip"
        style={{
          marginTop: 'auto', display: 'block', textAlign: 'center',
          background: 'var(--violet)', color: '#fff', borderRadius: '8px',
          padding: '0.5625rem', fontSize: '0.8125rem', fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Get VIP QR code →
      </a>
    </div>
  )
}
