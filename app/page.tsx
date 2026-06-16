'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

function AnimatedNumber({ target, prefix = '', suffix = '' }: { target: number; prefix?: string; suffix?: string }) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const steps = 60
    const increment = target / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(current))
    }, 2000 / steps)
    return () => clearInterval(timer)
  }, [target])
  return <span>{prefix}{value.toLocaleString()}{suffix}</span>
}

export default function Home() {
  return (
    <div style={{ backgroundColor: 'var(--ink)', color: 'var(--text-primary)', minHeight: '100vh' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ backgroundColor: 'rgba(19,20,28,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.25rem' }}>
              Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
            </span>
            <div className="flex items-center gap-6">
              <a href="#how-it-works" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>How it works</a>
              <a href="#pricing" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Pricing</a>
              <Link href="/login" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Log in</Link>
              <Link href="/signup" style={{ backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 1.25rem', textDecoration: 'none' }}>
                Get started free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">

        {/* Guarantee badge */}
        <div className="flex justify-center mb-10">
          <div style={{ backgroundColor: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '100px', padding: '0.4rem 1.125rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#4ade80', fontSize: '0.8125rem', fontWeight: 600 }}>✓ 3× ROI Guarantee in 60 days — or your money back</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.75rem, 5.5vw, 4.25rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.025em', margin: '0 0 1.5rem' }}>
            Your AI Revenue Operator<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7C5CFC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Brings Customers Back.
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.75, maxWidth: 580, margin: '0 auto 2.5rem' }}>
            Connect your Square account. Yara — your AI Revenue Operator — scores every customer,
            writes personalised win-back messages, and sends them automatically.
            You see exactly how much revenue she generates.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/signup" style={{ backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.9375rem 2.25rem', fontSize: '1.0625rem', textDecoration: 'none' }}>
              Connect Square — it's free to start
            </Link>
            <a href="#how-it-works" style={{ color: 'var(--text-secondary)', borderRadius: '10px', fontWeight: 600, padding: '0.9375rem 1.75rem', fontSize: '1.0625rem', border: '1px solid var(--border)', textDecoration: 'none' }}>
              See how it works →
            </a>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '1rem' }}>No credit card required · Setup in under 2 minutes</p>
        </div>

        {/* ── Live dashboard preview ───────────────────────────────────────── */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Revenue card */}
          <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '16px', padding: '1.75rem', gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Revenue This Month</div>
              <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', borderRadius: '6px', padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 700 }}>+41% vs last month</span>
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '3rem', fontWeight: 800, lineHeight: 1, marginBottom: '0.375rem' }}>
              $<AnimatedNumber target={12480} />
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>$4,200 attributed directly to Yara campaigns</div>
            <div className="flex items-end gap-1" style={{ height: 52 }}>
              {[28, 42, 36, 55, 40, 72, 58, 88, 64, 95, 78, 100].map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', backgroundColor: i >= 10 ? 'var(--violet)' : 'rgba(124,92,252,0.18)' }} />
              ))}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '0.375rem' }}>Last 12 weeks · bars = weekly revenue</div>
          </div>

          {/* Right stats */}
          <div className="flex flex-col gap-4">
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', flex: 1 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>Customers won back</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}><AnimatedNumber target={127} /></div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>this month · 44% return rate</div>
              <div style={{ marginTop: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '100px', height: 5 }}>
                <div style={{ backgroundColor: 'var(--violet)', borderRadius: '100px', height: 5, width: '44%' }} />
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.5rem', flex: 1 }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>Yara's latest messages</div>
              {[
                { name: 'Maria T.', msg: 'Came back after 47 days · $68' },
                { name: 'James R.', msg: 'Used promo code · $112' },
                { name: 'Priya K.', msg: 'Birthday offer · $89' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-2 last:mb-0">
                  <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#4ade80', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{item.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ───────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1.25rem 0', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8">
          {[
            '✓ Works with Square POS',
            '✓ No technical setup',
            '✓ 3× ROI in 60 days — guaranteed',
            '✓ Cancel anytime',
            '✓ TCPA compliant',
          ].map(item => (
            <span key={item} style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500 }}>{item}</span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '6rem 0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.875rem, 3.5vw, 2.75rem)', fontWeight: 800, marginBottom: '1rem' }}>
              Set it up once. Yara works forever.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', maxWidth: 520, margin: '0 auto' }}>
              No campaigns to write. No lists to manage. No manual work — ever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step: '01',
                title: 'Connect your Square',
                body: 'One click — RevOverflow reads your customer history, orders, and purchase patterns securely. Setup takes under 2 minutes.',
                icon: '🔗',
              },
              {
                step: '02',
                title: 'Yara scores everyone',
                body: 'Your AI Revenue Operator ranks every customer by Recency, Frequency, and Value. She knows exactly who to target, when, and with what message.',
                icon: '✦',
              },
              {
                step: '03',
                title: 'Customers return',
                body: 'Yara sends personalised SMS and email campaigns automatically. A 15% control group never gets a message — so you can see the exact revenue Yara earns you.',
                icon: '💰',
              },
            ].map((item) => (
              <div key={item.step} style={{ position: 'relative' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{item.icon}</div>
                <div style={{ color: 'var(--violet)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>STEP {item.step}</div>
                <div style={{ width: 32, height: 3, backgroundColor: 'var(--violet)', borderRadius: 2, marginBottom: '1.25rem' }} />
                <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' }}>{item.title}</h3>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, fontSize: '0.9375rem' }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUARANTEE ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 0', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🛡️</div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.875rem, 3.5vw, 2.5rem)', fontWeight: 800, marginBottom: '1.25rem' }}>
            3× ROI in 60 days.<br />
            <span style={{ color: '#4ade80' }}>Or we refund every dollar.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', lineHeight: 1.75, maxWidth: 540, margin: '0 auto 2rem' }}>
            If Yara doesn't generate at least 3× your subscription cost in verified, attributed revenue
            within 60 days — we'll refund your money, no questions asked.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { label: 'Core plan', price: '$297/mo', roi: 'Guarantee: $891+ in 60 days' },
              { label: 'Brain plan', price: '$597/mo', roi: 'Guarantee: $1,791+ in 60 days' },
              { label: 'Empire plan', price: '$1,197/mo', roi: 'Guarantee: $3,591+ in 60 days' },
            ].map(g => (
              <div key={g.label} style={{ backgroundColor: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.25rem' }}>{g.label}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: '0.5rem' }}>{g.price}</div>
                <div style={{ color: '#4ade80', fontSize: '0.8125rem', fontWeight: 600 }}>{g.roi}</div>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '1.5rem' }}>
            Applies to Mode A accounts (1,000+ reachable customers). <a href="#pricing" style={{ color: 'var(--violet)', textDecoration: 'none' }}>See all plans</a>
          </p>
        </div>
      </section>

      {/* ── TWO MODES ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.875rem, 3.5vw, 2.75rem)', fontWeight: 800, marginBottom: '1rem' }}>
              Works wherever you are.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem' }}>
              Whether you have thousands of customers or you're just starting to collect data.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mode A */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid rgba(124,92,252,0.35)', borderRadius: '20px', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: 220, height: 220, background: 'radial-gradient(circle, rgba(124,92,252,0.1) 0%, transparent 70%)', transform: 'translate(60px,-60px)', pointerEvents: 'none' }} />
              <div style={{ display: 'inline-block', background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.3)', borderRadius: '8px', padding: '0.375rem 0.875rem', marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--violet)', fontSize: '0.8125rem', fontWeight: 700 }}>Mode A · Revenue Activation</span>
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.875rem' }}>
                You have customer data. Yara turns it into revenue.
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '1.75rem', fontSize: '0.9375rem' }}>
                If you've been running Square for a while, your data is already there. Connect once — Yara starts working immediately.
              </p>
              {['RFV customer scoring — know who is about to leave', 'AI-written win-back SMS & email per customer', 'Birthday, new customer, VIP & cross-sell campaigns', 'Control-group revenue proof', '3x ROI guarantee in 60 days'].map(f => (
                <div key={f} className="flex items-start gap-2 mb-2.5">
                  <span style={{ color: '#4ade80', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Mode B */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem' }}>
              <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.375rem 0.875rem', marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 700 }}>Mode B · Data Capture</span>
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.875rem' }}>
                Just starting? We'll build your customer base for you.
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '1.75rem', fontSize: '0.9375rem' }}>
                No customer list? No problem. RevOverflow gives you everything you need to capture emails and phone numbers from day one.
              </p>
              {['QR-code opt-in poster for your counter', 'VIP loyalty signup page with your branding', 'SMS double opt-in — fully TCPA compliant', 'Referral capture — customers bring friends', 'Auto-upgrades to Mode A once you hit 1,000 customers'].map(f => (
                <div key={f} className="flex items-start gap-2 mb-2.5">
                  <span style={{ color: 'var(--violet)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────────────── */}
      <section style={{ padding: '5rem 0', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, textAlign: 'center', marginBottom: '3rem' }}>
            What merchants are saying
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                quote: "Yara sent 340 win-back emails in one night. By Friday we had 47 customers back and $3,200 in revenue we would have lost forever.",
                name: 'Marcus B.',
                biz: 'Barbershop · Atlanta, GA',
                result: '+$3,200 in week 1',
              },
              {
                quote: "I was skeptical about AI writing my customer messages. Then I read one Yara sent — it mentioned exactly what the customer always orders. I couldn't have written it better myself.",
                name: 'Sandra L.',
                biz: 'Café · Chicago, IL',
                result: '52% win-back rate',
              },
              {
                quote: "The ROI guarantee sold me. $297 a month and Yara needs to make me $891. She made us $4,100 in the first month. Best investment I've made in years.",
                name: 'Tony R.',
                biz: 'Pizza restaurant · Brooklyn, NY',
                result: '13× ROI, month 1',
              },
            ].map((t) => (
              <div key={t.name} style={{ backgroundColor: 'var(--ink)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem' }}>
                <p style={{ color: 'var(--text-primary)', lineHeight: 1.75, fontSize: '0.9375rem', marginBottom: '1.5rem' }}>"{t.quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{t.biz}</div>
                  </div>
                  <span style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', borderRadius: '6px', padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 700 }}>{t.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '6rem 0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.875rem, 3.5vw, 2.75rem)', fontWeight: 800, marginBottom: '1rem' }}>
              Simple, performance-based pricing.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', maxWidth: 500, margin: '0 auto' }}>
              Every plan includes Yara credits. 1 credit = 1 SMS or 5 emails. Credits roll over 90 days.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              { name: 'Capture', price: 97,   credits: 200,   desc: 'Customer scoring, RFV segmentation, and your first 200 Yara credits/mo.', highlight: false },
              { name: 'Core',    price: 297,  credits: 1000,  desc: 'Win-back campaigns, revenue attribution proof, 1,000 credits/mo.', highlight: true },
              { name: 'Brain',   price: 597,  credits: 3000,  desc: 'Autonomous Yara — all 5 triggers run automatically. 3,000 credits/mo.', highlight: false },
              { name: 'Empire',  price: 1197, credits: 10000, desc: 'Multi-location, white-glove onboarding, 10,000 credits/mo.', highlight: false },
              { name: 'Network', price: 2997, credits: 30000, desc: 'Franchise & multi-brand. Revenue Commander features. 30,000 credits/mo.', highlight: false },
            ].map((plan) => (
              <div key={plan.name} style={{
                backgroundColor: plan.highlight ? 'rgba(124,92,252,0.08)' : 'var(--surface)',
                border: plan.highlight ? '1px solid rgba(124,92,252,0.5)' : '1px solid var(--border)',
                borderRadius: '16px', padding: '1.75rem', position: 'relative',
              }}>
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '100px', padding: '0.25rem 0.875rem', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Most popular
                  </div>
                )}
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>{plan.name}</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '2rem', fontWeight: 800, lineHeight: 1 }}>
                  ${plan.price.toLocaleString()}
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 400 }}>/mo</span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(124,92,252,0.12)', color: 'var(--violet)', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', margin: '0.625rem 0 1rem' }}>
                  ✦ {plan.credits.toLocaleString()} credits/mo
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.65, margin: '0 0 1.25rem' }}>{plan.desc}</p>
                <Link href="/signup" style={{
                  display: 'block', textAlign: 'center', padding: '0.6875rem',
                  borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
                  backgroundColor: plan.highlight ? 'var(--violet)' : 'transparent',
                  color: plan.highlight ? '#fff' : 'var(--text-secondary)',
                  border: plan.highlight ? 'none' : '1px solid var(--border)',
                  textDecoration: 'none',
                }}>
                  Get started
                </Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Need more credits? Buy packs anytime — they never expire. <Link href="/pricing" style={{ color: 'var(--violet)', textDecoration: 'none', fontWeight: 600 }}>See full pricing →</Link>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '6rem 0', backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Your customers are out there.<br />
            <span style={{ color: 'var(--violet)' }}>Yara will bring them back.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', lineHeight: 1.75, marginBottom: '2.5rem' }}>
            Connect Square in 2 minutes. Yara scores your customers and gets to work the same day.
            No technical setup. No contracts. 3× ROI in 60 days — guaranteed.
          </p>
          <Link href="/signup" style={{ backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '12px', fontWeight: 700, padding: '1rem 2.75rem', fontSize: '1.125rem', textDecoration: 'none', display: 'inline-block' }}>
            Start free — no credit card needed
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
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
