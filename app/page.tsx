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

// Small inline sparkline for the mockup stat cards.
function Sparkline({ color = '#7C5CFC', w = 96, h = 30 }: { color?: string; w?: number; h?: number }) {
  const pts = '0,25 12,21 24,23 36,15 48,17 60,9 72,12 84,4 96,6'
  return (
    <svg width={w} height={h} viewBox="0 0 96 30" preserveAspectRatio="none" style={{ display: 'block' }}>
      <polygon points={`${pts} 96,30 0,30`} fill={color} opacity="0.12" />
      <polyline points={pts} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Floating mini stat card used along the right edge of the hero mockup.
function FloatCard({ label, value, sub, subColor, anim, children }: {
  label: string; value: string; sub?: string; subColor?: string; anim: string; children?: React.ReactNode
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', boxShadow: '0 12px 28px -14px rgba(16,24,40,0.25)', animation: anim }}>
      <div style={{ fontSize: '0.5625rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.0625rem', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.5625rem', fontWeight: 700, color: subColor || 'var(--text-secondary)', marginTop: 3 }}>{sub}</div>}
      {children}
    </div>
  )
}

// Real POS logo with a clean text fallback until the image file is added to
// /public. Drop square.svg / clover.svg / toast.svg into public/ and the real
// marks appear automatically — no code change needed.
function PosLogo({ name, src, h = 24 }: { name: string; src: string; h?: number }) {
  const [err, setErr] = useState(false)
  if (err) {
    return <span style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>{name}</span>
  }
  return <img src={src} alt={name} style={{ height: h, width: 'auto', objectFit: 'contain', opacity: 0.9 }} onError={() => setErr(true)} />
}

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div style={{ backgroundColor: 'var(--ink)', color: 'var(--text-primary)', minHeight: '100vh', backgroundImage: 'radial-gradient(1000px 520px at 88% -8%, rgba(124,92,252,0.12), transparent 62%)', backgroundRepeat: 'no-repeat' }}>
      <style>{`
        @keyframes heroFloatA { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes heroFloatB { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
        @keyframes heroFloatC { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
        @keyframes livePulse { 0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.55); } 70% { box-shadow: 0 0 0 6px rgba(74,222,128,0); } 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); } }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ backgroundColor: 'rgba(247,247,251,0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/ro-icon.png" alt="RevOverflow" width={28} height={28} style={{ borderRadius: '8px' }} />
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.25rem' }}>
                Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
              </span>
            </span>

            {/* Desktop links */}
            <div className="hidden lg:flex items-center gap-6">
              <a href="#how-it-works" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>How it works</a>
              <a href="#pricing" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Pricing</a>
              <Link href="/login" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textDecoration: 'none' }}>Log in</Link>
              <Link href="/signup" style={{ backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, padding: '0.5rem 1.25rem', textDecoration: 'none' }}>
                Get started free
              </Link>
            </div>

            {/* Mobile hamburger toggle */}
            <button
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen(v => !v)}
              className="flex lg:hidden"
              style={{
                width: 36, height: 36, flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '5px',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              <span style={{
                display: 'block', width: 20, height: 2, borderRadius: 2, background: 'var(--text-primary)',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                transform: mobileMenuOpen ? 'translateY(7px) rotate(45deg)' : 'none',
              }} />
              <span style={{
                display: 'block', width: 20, height: 2, borderRadius: 2, background: 'var(--text-primary)',
                transition: 'opacity 0.2s ease',
                opacity: mobileMenuOpen ? 0 : 1,
              }} />
              <span style={{
                display: 'block', width: 20, height: 2, borderRadius: 2, background: 'var(--text-primary)',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                transform: mobileMenuOpen ? 'translateY(-7px) rotate(-45deg)' : 'none',
              }} />
            </button>
          </div>

          {/* Mobile dropdown panel */}
          {mobileMenuOpen && (
            <div className="lg:hidden" style={{ borderTop: '1px solid var(--border)', padding: '0.5rem 1.5rem 1.25rem' }}>
              <div className="flex flex-col">
                <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', textDecoration: 'none', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>How it works</a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', textDecoration: 'none', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>Pricing</a>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', textDecoration: 'none', padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>Log in</Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '8px',
                    fontSize: '0.9375rem', fontWeight: 600, padding: '0.75rem', textDecoration: 'none',
                    textAlign: 'center', marginTop: '0.875rem',
                  }}
                >
                  Get started free
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4375rem', background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: '100px', padding: '0.3125rem 0.875rem', marginBottom: '1.5rem' }}>
              <span style={{ color: 'var(--violet)', fontSize: '0.875rem' }}>✦</span>
              <span style={{ color: 'var(--violet)', fontSize: '0.8125rem', fontWeight: 700 }}>Meet Yara — your AI Revenue Manager</span>
            </div>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(2.5rem, 4.2vw, 3.5rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.025em', margin: '0 0 1.5rem' }}>
              Tell Yara your revenue goal.<br />
              <span style={{ position: 'relative', display: 'inline-block' }}>
                <span style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7C5CFC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  She helps you hit it.
                </span>
                <svg viewBox="0 0 300 12" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, bottom: '-0.45rem', width: '100%', height: '0.7rem' }}>
                  <path d="M3 8 C 80 2, 220 2, 297 7" stroke="#7C5CFC" strokeWidth="4" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', lineHeight: 1.7 }} className="max-w-none lg:max-w-[480px] mx-auto lg:mx-0 mb-5">
              Connect Square, Clover, or Toast and tell Yara how much revenue you want to generate this month.
              She finds the opportunities, brings customers back, runs the promotions, and shows you every dollar she generates.
            </p>
            <div className="flex items-center gap-2 justify-center lg:justify-start mb-8" style={{ color: 'var(--violet)', fontWeight: 700, fontSize: '0.9375rem' }}>
              <span>🛡️</span><span>For less than the cost of one employee.</span>
            </div>
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              <Link href="/signup" style={{ backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '10px', fontWeight: 700, padding: '0.9375rem 1.875rem', fontSize: '1rem', textDecoration: 'none' }}>
                Connect your POS — it&apos;s free to start →
              </Link>
              <a href="#how-it-works" style={{ color: 'var(--text-primary)', borderRadius: '10px', fontWeight: 600, padding: '0.9375rem 1.5rem', fontSize: '1rem', border: '1px solid var(--border)', textDecoration: 'none', background: 'var(--surface)' }}>
                See how it works →
              </a>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center lg:justify-start" style={{ marginTop: '1.125rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 500 }}>
              <span>✓ No credit card</span><span>✓ Setup in minutes</span><span>✓ Cancel anytime</span>
            </div>
            <div className="flex items-center gap-4 justify-center lg:justify-start flex-wrap" style={{ marginTop: '1.5rem' }}>
              <span style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '100px', padding: '0.375rem 0.875rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Connect in minutes</span>
              <PosLogo name="Square" src="/square.png" h={20} />
              <PosLogo name="Clover" src="/clover.png" h={20} />
              <PosLogo name="Toast" src="/toast.png" h={20} />
            </div>
          </div>

          {/* Right: product dashboard mockup + floating stat cards */}
          <div className="hidden md:block" style={{ position: 'relative', paddingRight: 40 }}>
            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '18px', boxShadow: '0 30px 60px -28px rgba(16,24,40,0.30)', overflow: 'hidden', animation: 'heroFloatA 8s ease-in-out infinite' }}>

              {/* Topbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: '1px solid var(--border)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <img src="/ro-icon.png" alt="" width={18} height={18} style={{ borderRadius: 5 }} />
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.8125rem' }}>Rev<span style={{ color: 'var(--violet)' }}>Overflow</span></span>
                </span>
                <span style={{ display: 'flex', gap: 6 }}>
                  {['This month ▾', 'All locations ▾'].map((t) => (
                    <span key={t} style={{ border: '1px solid var(--border)', borderRadius: 7, padding: '3px 8px', fontSize: '0.625rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{t}</span>
                  ))}
                </span>
              </div>

              {/* Body: sidebar + main */}
              <div style={{ display: 'flex' }}>
                {/* Sidebar */}
                <div style={{ width: 124, borderRight: '1px solid var(--border)', padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {[
                    { i: '🏠', l: 'Overview', a: true },
                    { i: '✦', l: 'Opportunities' },
                    { i: '📣', l: 'Campaigns' },
                    { i: '👥', l: 'Customers' },
                    { i: '📊', l: 'Revenue' },
                    { i: '📄', l: 'Reports' },
                    { i: '⚙️', l: 'Settings' },
                  ].map((n) => (
                    <div key={n.l} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, fontSize: '0.6875rem', fontWeight: n.a ? 700 : 500, color: n.a ? 'var(--violet)' : 'var(--text-secondary)', background: n.a ? 'rgba(124,92,252,0.1)' : 'transparent' }}>
                      <span style={{ fontSize: '0.75rem' }}>{n.i}</span>{n.l}
                    </div>
                  ))}
                  <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                    <div style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.12), rgba(124,92,252,0.04))', border: '1px solid rgba(124,92,252,0.2)', borderRadius: 9, padding: 8 }}>
                      <div style={{ fontSize: '0.625rem', fontWeight: 700 }}>Yara <span style={{ color: '#4ade80' }}>●</span></div>
                      <div style={{ fontSize: '0.5625rem', color: 'var(--text-secondary)', marginBottom: 4 }}>AI Revenue Manager</div>
                      <Sparkline color="#7C5CFC" w={96} h={22} />
                    </div>
                  </div>
                </div>

                {/* Main */}
                <div style={{ flex: 1, padding: '14px', minWidth: 0 }}>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.9375rem' }}>Good morning, Alex 👋</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem', marginBottom: 12 }}>Here&apos;s how you&apos;re doing this month.</div>

                  {/* KPI row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {[
                      { l: 'Revenue Goal', v: '$25,000', s: 'Edit goal', sc: 'var(--violet)', icon: '🎯', ic: 'rgba(124,92,252,0.12)' },
                      { l: 'Generated So Far', v: '$21,350', s: '85% to goal', sc: '#15803d', icon: '↑', ic: 'rgba(74,222,128,0.15)' },
                      { l: 'Gap to Goal', v: '$3,650', s: '4 days left', sc: 'var(--text-secondary)', icon: '✦', ic: 'rgba(251,146,60,0.15)' },
                    ].map((k) => (
                      <div key={k.l} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '9px 10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                          <span style={{ fontSize: '0.5625rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{k.l}</span>
                          <span style={{ width: 18, height: 18, borderRadius: 6, background: k.ic, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem' }}>{k.icon}</span>
                        </div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}>{k.v}</div>
                        <div style={{ fontSize: '0.5625rem', color: k.sc, fontWeight: 700, marginTop: 4 }}>{k.s}</div>
                      </div>
                    ))}
                  </div>

                  {/* Yara's Plan */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '11px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '0.75rem' }}>Yara&apos;s Plan</span>
                        <span style={{ background: 'var(--violet)', color: '#fff', borderRadius: 5, padding: '1px 5px', fontSize: '0.5rem', fontWeight: 800 }}>AI</span>
                      </span>
                      <span style={{ fontSize: '0.625rem', color: 'var(--violet)', fontWeight: 600 }}>View all</span>
                    </div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginBottom: 10 }}>Close the gap with these top opportunities.</div>

                    {[
                      { icon: '👥', ic: 'rgba(96,165,250,0.15)', t: 'Win back inactive customers', s: '312 customers · High chance to return', r: '$2,480' },
                      { icon: '🎁', ic: 'rgba(244,114,182,0.15)', t: 'Launch birthday campaign', s: '128 upcoming birthdays', r: '$850' },
                      { icon: '⭐', ic: 'rgba(251,191,36,0.15)', t: 'VIP promotion for top customers', s: '87 VIPs · Increase visit frequency', r: '$1,140' },
                    ].map((row, idx) => (
                      <div key={row.t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: idx > 0 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ width: 24, height: 24, borderRadius: 7, background: row.ic, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', flexShrink: 0 }}>{row.icon}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: 'block', fontWeight: 700, fontSize: '0.6875rem' }}>{row.t}</span>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.5625rem' }}>{row.s}</span>
                        </span>
                        <span style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.5rem' }}>Est. revenue</span>
                          <span style={{ display: 'block', color: '#15803d', fontWeight: 800, fontSize: '0.75rem' }}>{row.r}</span>
                        </span>
                        <span style={{ border: '1px solid rgba(124,92,252,0.4)', color: 'var(--violet)', borderRadius: 6, padding: '3px 8px', fontSize: '0.5625rem', fontWeight: 700, flexShrink: 0 }}>Review</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating stat cards */}
            <div className="hidden lg:flex" style={{ position: 'absolute', top: 28, right: -8, flexDirection: 'column', gap: 12, width: 150 }}>
              <FloatCard label="Revenue Generated" value="$21,350" anim="heroFloatB 9s ease-in-out infinite"><Sparkline color="#15803d" w={120} h={26} /></FloatCard>
              <FloatCard label="Campaigns Running" value="5" sub="● live" subColor="#15803d" anim="heroFloatC 10s ease-in-out infinite" />
              <FloatCard label="Customers Reached" value="2,374" anim="heroFloatB 11s ease-in-out infinite">
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  {['#7C5CFC', '#60a5fa', '#f472b6'].map((c, i) => (
                    <span key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '2px solid #fff', marginLeft: i ? -8 : 0 }} />
                  ))}
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', fontWeight: 700, marginLeft: 2 }}>+2.1k</span>
                </div>
              </FloatCard>
              <FloatCard label="ROI This Month" value="8.4×" anim="heroFloatC 12s ease-in-out infinite"><Sparkline color="#15803d" w={120} h={26} /></FloatCard>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ───────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '2.5rem 0 1.5rem' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', marginBottom: '1.25rem' }}>
            WORKS WITH THE POS YOU ALREADY USE
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            <PosLogo name="Square" src="/square.png" h={26} />
            <PosLogo name="Clover" src="/clover.png" h={26} />
            <PosLogo name="Toast" src="/toast.png" h={26} />
          </div>
        </div>
      </div>

      {/* ── FEATURE ROW ─────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '1.75rem 0', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: '📈', ic: 'rgba(124,92,252,0.12)', t: 'More Revenue', s: 'Focus on what matters most' },
            { icon: '⚡', ic: 'rgba(74,222,128,0.15)', t: 'Save Time', s: 'Yara works 24/7 for you' },
            { icon: '🛡️', ic: 'rgba(251,146,60,0.15)', t: 'Proven Results', s: 'See every dollar generated' },
            { icon: '🔒', ic: 'rgba(96,165,250,0.15)', t: 'Enterprise Security', s: 'Your data is always protected' },
          ].map((f) => (
            <div key={f.t} className="flex items-center gap-3">
              <span style={{ width: 40, height: 40, borderRadius: 10, background: f.ic, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', flexShrink: 0 }}>{f.icon}</span>
              <span>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '0.875rem' }}>{f.t}</span>
                <span style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{f.s}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '6rem 0' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 'clamp(1.875rem, 3.5vw, 2.75rem)', fontWeight: 800, marginBottom: '1rem' }}>
              Tell Yara your goal. She does the rest.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', maxWidth: 520, margin: '0 auto' }}>
              Connect once, set a revenue target, and let Yara work toward it 24/7 — with proof of every dollar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step: '01 · Connect',
                title: 'Connect your POS, Yara learns your business',
                body: 'Connect Square, Clover, or Toast in under 2 minutes. Yara instantly studies who your customers are, who is slipping away, and how much revenue is sitting in customers who stopped coming back.',
                icon: '🔌',
              },
              {
                step: '02 · Set your goal',
                title: 'Tell Yara how much more you want to make',
                body: 'Set a revenue goal for the month. Yara builds a plan to hit it — which customers to reach, what to offer, and the revenue each campaign is expected to bring in. You approve with one tap.',
                icon: '🎯',
              },
              {
                step: '03 · Yara grows it',
                title: 'Yara executes and proves the revenue',
                body: 'Yara runs the win-backs, birthdays, and VIP offers automatically, then shows you Revenue Recovered — net of what a held-out control group would have spent anyway. Real dollars, not estimates.',
                icon: '📈',
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
            <span style={{ color: '#15803d' }}>Or you're eligible for a refund.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', lineHeight: 1.75, maxWidth: 540, margin: '0 auto 2rem' }}>
            If Yara doesn't generate at least 3× your subscription cost in verified, attributed revenue
            within 60 days, you're eligible for a refund. See <a href="/terms#guarantee" style={{ color: 'var(--violet)', textDecoration: 'underline' }}>guarantee terms</a> for eligibility.
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
                <div style={{ color: '#15803d', fontSize: '0.8125rem', fontWeight: 600 }}>{g.roi}</div>
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
                If you've been running Square, Clover, or Toast for a while, your data is already there. Connect once — Yara starts working immediately.
              </p>
              {['RFV customer scoring — know who is about to leave', 'AI-written win-back SMS & email per customer', 'Birthday, new customer, VIP & cross-sell campaigns', 'Control-group revenue proof', '3x ROI guarantee in 60 days'].map(f => (
                <div key={f} className="flex items-start gap-2 mb-2.5">
                  <span style={{ color: '#15803d', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{f}</span>
                </div>
              ))}
            </div>

            {/* Mode B */}
            <div style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem' }}>
              <div style={{ display: 'inline-block', background: 'rgba(21,21,31,0.05)', border: '1px solid rgba(21,21,31,0.1)', borderRadius: '8px', padding: '0.375rem 0.875rem', marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 700 }}>Mode B · Data Capture</span>
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.875rem' }}>
                Just starting? We'll build your customer base for you.
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '1.75rem', fontSize: '0.9375rem' }}>
                No customer list? No problem. RevOverflow gives you everything you need to capture emails and phone numbers from day one.
              </p>
              {['QR-code opt-in counter cards & window stickers — printed and shipped free', 'VIP loyalty signup page with your branding', 'SMS double opt-in — fully TCPA compliant', 'Referral capture — customers bring friends', 'Auto-upgrades to Mode A once you hit 1,000 customers'].map(f => (
                <div key={f} className="flex items-start gap-2 mb-2.5">
                  <span style={{ color: 'var(--violet)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>{f}</span>
                </div>
              ))}
            </div>
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
            Hire Yara today.<br />
            <span style={{ color: 'var(--violet)' }}>Your AI Revenue Manager.</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.0625rem', lineHeight: 1.75, marginBottom: '2.5rem' }}>
            For less than the cost of one employee, Yara works 24/7 to grow your revenue.
            Connect your POS in 2 minutes, set your goal, and she gets to work the same day.
            No technical setup. No contracts. 3× ROI in 60 days, or you're eligible for a refund.
          </p>
          <Link href="/signup" style={{ backgroundColor: 'var(--violet)', color: '#fff', borderRadius: '12px', fontWeight: 700, padding: '1rem 2.75rem', fontSize: '1.125rem', textDecoration: 'none', display: 'inline-block' }}>
            Start free — no credit card needed
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '2.5rem 0' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem' }}>
            <img src="/ro-icon.png" alt="RevOverflow" width={22} height={22} style={{ borderRadius: '6px' }} />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1rem' }}>
              Rev<span style={{ color: 'var(--violet)' }}>Overflow</span>
            </span>
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>© 2026 RevOverflow. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/privacy" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', textDecoration: 'none' }}>Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
