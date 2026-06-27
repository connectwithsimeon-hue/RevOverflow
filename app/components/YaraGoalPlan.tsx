'use client'

/**
 * YaraGoalPlan — the centerpiece of the dashboard.
 *
 * Instead of a to-do list, this shows Yara's living PLAN to hit the merchant's
 * revenue goal: a stacked ladder of levers (win-back, capture, acquire,
 * reviews), each with its estimated contribution and the one action it needs.
 * Yara never stops at "I can only reach your current base" — she stacks the
 * levers that GROW the base toward the goal. Win-back is live (approve → sends);
 * the growth levers link to their setup. Honest about the realistic landing.
 */
import { useEffect, useState } from 'react'

interface Rec { title: string; detail: string; estimatedRevenue?: number; cta?: { label: string; href: string } }
interface Agent { id: string; name: string; icon: string; recommendations: Rec[] }
interface Goal {
  goalAmount: number; revenueToDate: number; daysLeft: number; status: string
  baseline?: { avgMonthlyRevenue: number; avgTicket: number }
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function YaraGoalPlan() {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<Record<string, 'sending' | 'sent' | 'error'>>({})
  const [msg, setMsg] = useState<Record<string, string>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/goal').then(r => r.json()).catch(() => ({})),
      fetch('/api/agents').then(r => r.json()).catch(() => ({})),
    ]).then(([g, a]) => {
      if (!g.error) setGoal(g)
      setAgents(a.agents ?? [])
    }).finally(() => setLoading(false))
  }, [])

  async function approve(key: string, trigger: string) {
    setStatus(s => ({ ...s, [key]: 'sending' }))
    try {
      const res = await fetch('/api/yara/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trigger }) })
      const d = await res.json()
      if (!res.ok || !d.ok) { setStatus(s => ({ ...s, [key]: 'error' })); setMsg(m => ({ ...m, [key]: d.error || 'Could not send.' })); return }
      setStatus(s => ({ ...s, [key]: 'sent' }))
      setMsg(m => ({ ...m, [key]: d.sent ? `Sent to ${d.sent} — watching for returns` : (d.reason === 'all_contacted_recently' ? 'Everyone was contacted recently' : 'No one to reach right now') }))
    } catch {
      setStatus(s => ({ ...s, [key]: 'error' })); setMsg(m => ({ ...m, [key]: 'Network error — try again' }))
    }
  }

  if (loading) return <div style={card}>Yara is building your plan…</div>

  const recOf = (id: string) => agents.find(a => a.id === id)?.recommendations?.[0]
  const ticket = goal?.baseline?.avgTicket ?? 0
  const made = goal?.revenueToDate ?? 0
  const goalAmount = goal?.goalAmount ?? 0
  const daysLeft = goal?.daysLeft ?? 0
  const gap = Math.max(0, goalAmount - made)
  const hasGoal = goalAmount > 0 && goal?.status !== 'no_goal'

  const winRec = recOf('winback')
  const acqRec = recOf('acquisition')
  const revRec = recOf('reputation')

  const winEst = winRec?.estimatedRevenue ?? 0
  const capEst = ticket ? Math.round(daysLeft * ticket * 0.5) : 0
  const acqEst = acqRec?.estimatedRevenue ?? (ticket ? Math.round((500 / 25) * ticket * 1.5) : 0)
  const revEst = revRec?.estimatedRevenue ?? (ticket ? Math.round(ticket * 5) : 0)

  interface Lever { key: string; icon: string; title: string; desc: string; est: number; ready: boolean; trigger?: string; href?: string; actionLabel: string }
  const levers: Lever[] = [
    { key: 'winback', icon: '🔁', title: 'Win back slipping customers', desc: winRec?.detail || 'Bring back customers who’ve gone quiet with a personal offer.', est: winEst, ready: true, trigger: 'win_back', actionLabel: 'Approve & send' },
    { key: 'capture', icon: '📇', title: 'Capture every walk-in', desc: 'Put Yara’s QR card at the counter so every visitor joins — this is how your base grows past where it is today.', est: capEst, ready: false, href: '/dashboard/decals', actionLabel: 'Place my QR card →' },
    { key: 'acquire', icon: '📣', title: 'Bring in brand-new customers', desc: acqRec?.detail || 'Run ads to reach people who’ve never visited. Set a budget and Yara handles the rest.', est: acqEst, ready: false, href: '/account', actionLabel: 'Set a budget →' },
    { key: 'reviews', icon: '⭐', title: 'Turn visits into Google reviews', desc: revRec?.detail || 'Ask happy customers for a review after they visit — a better rating pulls in more walk-ins.', est: revEst, ready: false, href: '/dashboard/reputation', actionLabel: 'Turn on review asks →' },
  ]

  const projected = made + levers.reduce((s, l) => s + l.est, 0)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '1.5rem 1.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: '1.125rem', margin: 0 }}>Yara&apos;s plan to hit your goal</h2>
        <span style={{ background: 'var(--violet)', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6 }}>AI</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, lineHeight: 1.55, margin: '0 0 16px' }}>
        {hasGoal
          ? <>You&apos;re <b style={{ color: 'var(--text-primary)' }}>{money(gap)}</b> short of your {money(goalAmount)} goal with {daysLeft} day{daysLeft === 1 ? '' : 's'} left. I can&apos;t close that from your current customers alone — so here&apos;s my full plan, including growing your base. Approve each piece and I&apos;ll get to work.</>
          : <>Set your goal above and I&apos;ll build the plan to hit it.</>}
      </p>

      {/* Made so far */}
      <Row icon="✅" title="Made so far this month" desc="Your revenue to date." est={made} estColor="var(--text-secondary)" action={null} />

      {levers.map(l => {
        const st = status[l.key]
        let action: React.ReactNode
        if (st === 'sent') action = <span style={{ color: '#15803d', fontWeight: 700, fontSize: 12.5, textAlign: 'right', maxWidth: 130 }}>✓ {msg[l.key]}</span>
        else if (l.ready && l.trigger) {
          if (st === 'sending') action = <span style={{ ...solid, opacity: 0.6 }}>Sending…</span>
          else if (st === 'error') action = (
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <button onClick={() => approve(l.key, l.trigger!)} style={solid}>Try again</button>
              <span style={{ color: '#b91c1c', fontSize: 10.5, maxWidth: 130, textAlign: 'right' }}>{msg[l.key]}</span>
            </span>
          )
          else action = <button onClick={() => approve(l.key, l.trigger!)} style={solid}>{l.actionLabel}</button>
        } else {
          action = <a href={l.href} style={ghost}>{l.actionLabel}</a>
        }
        return <Row key={l.key} icon={l.icon} title={l.title} desc={l.desc} est={l.est} ready={l.ready} action={action} />
      })}

      {/* Projected */}
      {hasGoal && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>🎯 Projected with the full plan</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: projected >= goalAmount ? '#15803d' : 'var(--violet)' }}>{money(projected)}</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12.5, margin: '6px 0 0', lineHeight: 1.5 }}>
            {projected >= goalAmount
              ? `That clears your ${money(goalAmount)} goal. Approve the pieces and I'll make it happen.`
              : `That's the closest I can get to ${money(goalAmount)} this month — capture and reviews keep compounding into next month as your base grows.`}
          </p>
        </div>
      )}
    </div>
  )
}

function Row({ icon, title, desc, est, action, ready, estColor }: {
  icon: string; title: string; desc: string; est: number; action: React.ReactNode; ready?: boolean; estColor?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.9rem 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--ink-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{title}</span>
          {ready === true && <span style={tag('#15803d', 'rgba(74,222,128,0.15)')}>Ready now</span>}
          {ready === false && <span style={tag('#92400e', 'rgba(251,191,36,0.15)')}>Needs you</span>}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 12.5, lineHeight: 1.45, marginTop: 2 }}>{desc}</div>
      </div>
      {est > 0 && (
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 64 }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>{estColor ? '' : 'adds'}</div>
          <div style={{ fontWeight: 800, color: estColor || '#15803d', fontSize: 15 }}>{estColor ? money(est) : `+${money(est)}`}</div>
        </div>
      )}
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '1.5rem', color: 'var(--text-secondary)', fontSize: 14 }
const solid: React.CSSProperties = { background: 'var(--violet)', border: '1px solid var(--violet)', color: '#fff', fontWeight: 700, fontSize: 13, padding: '0.5rem 1rem', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }
const ghost: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--violet)', fontWeight: 700, fontSize: 13, padding: '0.5rem 0.9rem', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap' }
const tag = (color: string, bg: string): React.CSSProperties => ({ fontSize: 9.5, fontWeight: 800, color, background: bg, padding: '1px 6px', borderRadius: 5, letterSpacing: '0.03em', textTransform: 'uppercase', whiteSpace: 'nowrap' })
