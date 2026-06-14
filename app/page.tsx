'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function AnimatedNumber({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const duration = 2000
    const steps = 60
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setValue(target)
        clearInterval(timer)
      } else {
        setValue(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [target])
  return <span>{prefix}{value.toLocaleString()}{suffix}</span>
}

export default function Home() {
  return (
    <div style={{ backgroundColor: 'var(--ink)', color: 'var(--text-primary)', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ backgroundColor: 'rgba(19,20,28,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.25rem' }}>
              Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
            </span>
            <div className="flex items-center gap-6">
              <a href="#how-it-works" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>How it works</a>
              <a href="#pricing" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Pricing</a>
              <Link href="/login" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Log in</Link>
              <Link
                href="/signup"
                style={{ backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 1.25rem', textDecoration: 'none' }}
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div style={{ maxWidth: '680px' }}>
          <div className="inline-flex items-center gap-2 mb-6" style={{ backgroundColor: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: '100px', padding: '0.375rem 1rem' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--violet)', display: 'inline-block' }} />
            <span style={{ color: 'var(--violet-light)', fontSize: '0.8125rem', fontWeight: 500 }}>Powered by Yara — your AI Revenue Operator</span>
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', margin: 0 }}>
            We Bring Your<br />
            <span style={{ background: 'linear-gradient(135deg, var(--violet-light) 0%, #B69DFE 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Customers Back.
            </span>
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.7, marginTop: '1.5rem', maxWidth: '560px' }}>
            RevOverflow connects to your Square account and automatically wins back the customers
            who drifted away — with proof of every dollar it makes you.
          </p>

          <div className="flex flex-wrap gap-4 mt-10">
            <Link
              href="/signup"
              style={{ backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.875rem 2rem', fontSize: '1rem', textDecoration: 'none' }}
            >
              Start free — connect Square in minutes
            </Link>
            <a
              href="#how-it-works"
              style={{ color: 'var(--text-secondary)', borderRadius: '10px', fontWeight: 600, padding: '0.875rem 1.5rem', fontSize: '1rem', border: '1px solid var(--border)', textDecoration: 'none' }}
            >
              See how it works
            </a>
          </div>
        </div>

        {/* DASHBOARD MOCK */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue card */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem' }}>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
              Revenue Generated · June 2026
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>
              $<AnimatedNumber target={9400} />
            </div>
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#4ade80', borderRadius: '6px', padding: '0.25rem 0.625rem', fontSize: '0.8125rem', fontWeight: 600 }}>+$9,400</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>vs $0 for control group · proven attribution</span>
            </div>
            <div className="flex items-end gap-1.5 mt-6" style={{ height: 48 }}>
              {[30, 55, 40, 70, 45, 85, 60, 95, 75, 100, 80, 90].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '4px 4px 0 0', backgroundColor: i === 11 ? 'var(--violet)' : 'rgba(124,92,252,0.2)' }} />
              ))}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>Last 12 weeks</div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', flex: 1 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                Customers Returned
              </div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>
                <AnimatedNumber target={214} />
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.5rem' }}>this month · out of 412 lapsed</div>
              <div className="mt-4" style={{ backgroundColor: 'var(--ink-muted)', borderRadius: '100px', height: 6 }}>
                <div style={{ backgroundColor: 'var(--violet)', borderRadius: '100px', height: 6, width: '52%' }} />
              </div>
              <div style={{ color: 'var(--violet-light)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 500 }}>52% win-back rate</div>
            </div>

            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', flex: 1 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
                Recent Wins
              </div>
              {[
                { name: 'Maria T.', note: 'Returned after 47 days · $68 order' },
                { name: 'James R.', note: 'Used COMEBACK10 promo · $112 order' },
                { name: 'Priya K.', note: 'Returned after 31 days · $44 order' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ade80', marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{item.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '6rem 0', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 800, textAlign: 'center', marginBottom: '1rem' }}>
            Three steps. Zero manual work.
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '4rem', fontSize: '1.0625rem' }}>
            Connect once. Yara handles the rest — forever.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Connect your Square', body: 'One OAuth click. RevOverflow reads your customer history, order data, and purchase patterns — securely, with no data ever leaving your control.' },
              { step: '02', title: 'Yara gets to work', body: "Your AI Revenue Operator scores every customer, identifies who's at risk of churning, and crafts personalised win-back messages — automatically." },
              { step: '03', title: 'Customers return', body: 'Targeted SMS and email go out automatically. A 15% control group never receives them — so you can see the exact revenue Yara generates for you.' },
            ].map((item) => (
              <div key={item.step}>
                <div style={{ color: 'var(--violet)', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '1rem' }}>STEP {item.step}</div>
                <div style={{ width: 40, height: 3, backgroundColor: 'var(--violet)', borderRadius: 2, marginBottom: '1.5rem' }} />
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.9375rem' }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TWO MODES */}
      <section style={{ padding: '6rem 0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 800, textAlign: 'center', marginBottom: '1rem' }}>
            Wherever you are, we&apos;ve got you.
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '4rem', fontSize: '1.0625rem' }}>
            RevOverflow works for businesses at every stage.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '20px', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: 'radial-gradient(circle, rgba(124,92,252,0.12) 0%, transparent 70%)', transform: 'translate(60px, -60px)', pointerEvents: 'none' }} />
              <div style={{ display: 'inline-block', backgroundColor: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '8px', padding: '0.375rem 0.875rem', marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--violet-light)', fontSize: '0.8125rem', fontWeight: 600 }}>Revenue Activation</span>
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Already have customer data?</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                If you&apos;ve been running Square for a while, your data is already there. Yara starts scoring and sending win-back campaigns immediately after you connect.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['RFV scoring on all customers', 'Automated win-back SMS & email', 'Control-group revenue attribution', 'Segment-based targeting'].map(f => (
                  <li key={f} className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                    <span style={{ color: '#4ade80', fontWeight: 700 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem' }}>
              <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.375rem 0.875rem', marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600 }}>Data Capture</span>
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Don&apos;t have the data yet?</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
                No problem. RevOverflow helps you build your customer list from day one — with opt-in tools that collect emails and phone numbers at every transaction.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {['QR-code opt-in at checkout', 'Receipt-prompt enrollment', 'SMS double opt-in', 'Auto-upgrades to Revenue Activation when ready'].map(f => (
                  <li key={f} className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                    <span style={{ color: 'var(--violet-light)', fontWeight: 700 }}>→</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '6rem 0', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 800, textAlign: 'center', marginBottom: '1rem' }}>
            Simple, predictable pricing.
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '4rem', fontSize: '1.0625rem' }}>
            All plans include the full product — capacity and breadth differ, never features.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              { name: 'Capture', price: 97, desc: 'Start collecting customer data and building your list.', highlight: false },
              { name: 'Core', price: 297, desc: 'Win back lapsed customers with automated campaigns.', highlight: false },
              { name: 'Brain', price: 597, desc: 'AI-powered targeting with full RFV scoring engine.', highlight: true },
              { name: 'Empire', price: 1197, desc: 'Multiple locations, advanced analytics, priority support.', highlight: false },
            ].map((plan) => (
              <div key={plan.name} style={{ backgroundColor: plan.highlight ? 'rgba(124,92,252,0.08)' : 'var(--ink-light)', border: plan.highlight ? '1px solid rgba(124,92,252,0.45)' : '1px solid var(--border)', borderRadius: '16px', padding: '2rem', position: 'relative' }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '100px', padding: '0.25rem 0.875rem', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Most popular
                  </div>
                )}
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.0625rem', marginBottom: '0.5rem' }}>{plan.name}</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.25rem', fontWeight: 800, lineHeight: 1 }}>
                  ${plan.price}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', fontWeight: 400 }}>/mo</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, margin: '1rem 0 1.5rem' }}>{plan.desc}</p>
                <Link href="/signup" style={{ display: 'block', textAlign: 'center', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, backgroundColor: plan.highlight ? 'var(--violet)' : 'transparent', color: plan.highlight ? '#fff' : 'var(--text-secondary)', border: plan.highlight ? 'none' : '1px solid var(--border)', textDecoration: 'none' }}>
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '6rem 0' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Your customers are out there.<br />
            <span style={{ color: 'var(--violet-light)' }}>Yara will bring them back.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', lineHeight: 1.7, marginBottom: '2.5rem' }}>
            Connect your Square account in minutes. No technical setup. No contracts. Cancel anytime.
          </p>
          <Link href="/signup" style={{ backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '1rem 2.5rem', fontSize: '1.0625rem', textDecoration: 'none', display: 'inline-block' }}>
            Start your free trial
          </Link>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '1rem' }}>No credit card required during trial.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '2.5rem 0' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1rem' }}>
            Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>© 2026 SiMaYa Labs. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textDecoration: 'none' }}>Terms</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
