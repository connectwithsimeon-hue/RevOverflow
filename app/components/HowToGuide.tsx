/**
 * HowToGuide — a friendly "how to use RevOverflow" walkthrough.
 *
 * Renders a small "How to use" button (for the dashboard topbar) AND the modal.
 * It opens automatically the first time a merchant logs in (tracked in
 * localStorage) and can be reopened anytime from the button.
 */
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STEPS: { icon: string; title: string; body: string }[] = [
  { icon: '🔌', title: 'Connect your POS', body: 'Link Square, Clover, or Toast. Yara imports your customers and sales, scores everyone, and instantly shows how much revenue is sitting in customers who stopped coming.' },
  { icon: '🎯', title: 'Set your revenue goal', body: 'Tell Yara how much you want to make this month. She builds a plan — which customers to reach and what to offer — to help you hit it.' },
  { icon: '🤖', title: 'Meet Yara’s agents', body: 'Win-Back, VIP, Birthday, Loyalty, Membership, Reputation and more each find a different way to grow revenue. Review their suggestions and approve the ones you like.' },
  { icon: '✉️', title: 'Launch a campaign', body: 'Yara writes a personal SMS or email for each customer and sends it. You just approve — no copywriting, no list-building.' },
  { icon: '📲', title: 'The one staff habit', body: 'Every offer tells the customer to give their phone number at checkout. Teach your team to ask “What’s your number?” at the register — that’s how Yara proves the exact revenue she made you, even for walk-ins.' },
  { icon: '💰', title: 'Watch Revenue Recovered', body: 'Your dashboard shows the real dollars Yara generated — verified against a held-out control group, so it’s proof, not a guess.' },
]

const SETUP_LINKS: { label: string; href: string; note: string }[] = [
  { label: 'Products', href: '/dashboard/products', note: 'Add product costs so Yara protects your margins' },
  { label: 'Membership', href: '/dashboard/membership', note: 'Turn regulars into recurring revenue' },
  { label: 'Loyalty', href: '/dashboard/loyalty', note: 'Set a “reward every N visits” program' },
  { label: 'Reputation', href: '/dashboard/reputation', note: 'Connect Google to monitor your reviews' },
]

const SEEN_KEY = 'ro_seen_howto'

export default function HowToGuide() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) {
        setOpen(true)
        localStorage.setItem(SEEN_KEY, '1')
      }
    } catch { /* ignore */ }
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '0.5rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        <span aria-hidden="true">❓</span> How to use
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,25,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '4vh 1rem', overflowY: 'auto' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'var(--surface)', borderRadius: 18, maxWidth: 560, width: '100%', boxShadow: '0 24px 60px -20px rgba(16,24,40,0.4)', overflow: 'hidden' }}
          >
            <div style={{ background: 'linear-gradient(135deg, #7C5CFC, #a78bfa)', padding: '1.5rem 1.75rem', color: '#fff', position: 'relative' }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.25rem' }}>Welcome to RevOverflow 👋</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.92, marginTop: '0.25rem' }}>Here’s how Yara makes you money — in 6 quick steps.</div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ position: 'absolute', top: 14, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: '1rem', fontFamily: 'inherit' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem 1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                {STEPS.map((s, i) => (
                  <div key={s.title} style={{ display: 'flex', gap: '0.875rem' }}>
                    <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 10, background: 'rgba(124,92,252,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{s.icon}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}><span style={{ color: 'var(--violet)' }}>{i + 1}.</span> {s.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.55, marginTop: '0.125rem' }}>{s.body}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.75rem' }}>Optional setup that makes Yara smarter</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {SETUP_LINKS.map((l) => (
                    <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '0.625rem 0.75rem', textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--violet)' }}>{l.label} →</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.35, marginTop: '0.125rem' }}>{l.note}</div>
                    </Link>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                style={{ marginTop: '1.5rem', width: '100%', background: 'var(--violet)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.75rem', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Got it — let’s grow some revenue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
