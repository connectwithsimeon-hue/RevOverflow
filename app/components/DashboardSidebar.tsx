/**
 * DashboardSidebar
 * Persistent left navigation for the logged-in app shell (dashboard, campaigns,
 * customers, account). Server component — no client JS needed, just links and
 * a server-action form for sign-out.
 */
import Link from 'next/link'
import { logout } from '@/app/actions/auth'

type Route = 'dashboard' | 'campaigns' | 'customers' | 'products' | 'membership' | 'loyalty' | 'reputation' | 'decals' | 'account'

const NAV: { key: Route; label: string; href: string; icon: JSX.Element }[] = [
  {
    key: 'dashboard', label: 'Dashboard', href: '/dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    key: 'campaigns', label: 'Campaigns', href: '/campaigns',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-7-7 18-2-8-9-3z" />
      </svg>
    ),
  },
  {
    key: 'customers', label: 'Customers', href: '/customers',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    key: 'products', label: 'Products', href: '/dashboard/products',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    key: 'membership', label: 'Membership', href: '/dashboard/membership',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 8v13H3V8" /><path d="M1 3h22v5H1z" /><path d="M10 12h4" />
      </svg>
    ),
  },
  {
    key: 'loyalty', label: 'Loyalty', href: '/dashboard/loyalty',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
  {
    key: 'reputation', label: 'Reputation', href: '/dashboard/reputation',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    key: 'decals', label: 'Decals', href: '/dashboard/decals',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 17.5h7" /><path d="M17.5 14v7" />
      </svg>
    ),
  },
  {
    key: 'account', label: 'Account', href: '/account',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
]

export default function DashboardSidebar({ active, plan }: { active: Route; plan?: string | null }) {
  const isPro = ['brain', 'empire'].includes(plan || '')

  return (
    <aside style={{
      width: 232, flexShrink: 0, minHeight: '100vh',
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      position: 'sticky', top: 0, display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1rem',
    }}>
      <Link href="/dashboard" style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.0625rem',
        textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0 0.5rem', marginBottom: '2rem',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ro-icon.png" alt="" width={30} height={30} style={{ borderRadius: '8px', flexShrink: 0 }} />
        <span>Rev<span style={{ color: 'var(--violet)' }}>Overflow</span></span>
      </Link>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {NAV.map(item => {
          const isActive = item.key === active
          return (
            <Link key={item.key} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.625rem 0.75rem', borderRadius: '10px',
              textDecoration: 'none', fontSize: '0.875rem', fontWeight: isActive ? 700 : 500,
              color: isActive ? '#fff' : 'var(--text-secondary)',
              background: isActive ? 'var(--violet)' : 'transparent',
              transition: 'background 0.15s ease',
            }}>
              <span style={{ display: 'flex', opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {!isPro && (
        <Link href="/pricing" style={{
          display: 'block', textDecoration: 'none',
          background: 'linear-gradient(160deg, rgba(124,92,252,0.18) 0%, rgba(124,92,252,0.05) 100%)',
          border: '1px solid rgba(124,92,252,0.3)', borderRadius: '14px',
          padding: '1rem', marginBottom: '0.75rem',
        }}>
          <div style={{ fontSize: '1.25rem', marginBottom: '0.375rem' }}>✦</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>
            Unlock Yara Autopilot
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.75rem', lineHeight: 1.4 }}>
            Autonomous campaigns + multi-POS sync
          </div>
          <div style={{
            background: 'var(--violet)', color: '#fff', borderRadius: '8px',
            padding: '0.4rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 700,
          }}>
            Upgrade →
          </div>
        </Link>
      )}

      <form action={logout}>
        <button type="submit" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
          color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500,
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          padding: '0.625rem 0.75rem', borderRadius: '10px',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </form>
    </aside>
  )
}
