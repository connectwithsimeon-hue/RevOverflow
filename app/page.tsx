// app/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import PosLogo from "./components/PosLogo";
import AgentIcon from "./components/AgentIcon";

const agents: [string, string, string, string][] = [
  ["/winBackAgent.png", "/Reachable_Customers.png", "Win-Back Agent", "Finds customers who stopped visiting and brings them back."],
  ["/VipAgent.png", "/Customer_Insights.png", "VIP Agent", "Increases visits and spend from your best customers."],
  ["/BirthdayAgent.png", "/Smart_Campaigns.png", "Birthday Agent", "Captures high-converting birthday revenue, automatically."],
  ["/MembershipAgent.png", "/Revenue_Goal_Tracking.png", "Membership Agent", "Turns your regulars into predictable recurring revenue."],
  ["/CapacityAgent.png", "/Save_Time.png", "Capacity Agent", "Fills your slow days by shifting demand off-peak."],
  ["/AcquisitionAgent.png", "/AI_Powered_Opportunities.png", "Acquisition Agent", "Finds and brings in brand-new customers."],
];

const navItems: [string, string][] = [
  ["How it works", "#how-it-works"],
  ["Features", "#features"],
  ["Pricing", "#pricing"],
  ["Resources", "#faq"],
];
const metrics = [
  { label: "Revenue Goal", value: "$25,000", note: "Edit goal →" },
  { label: "Generated So Far", value: "$21,350", note: "85% to goal" },
  { label: "Gap to Goal", value: "$3,650", note: "4 days left" },
];
const planItems = [
  { title: "Win back inactive customers", subtitle: "312 customers · high chance to return", revenue: "$2,480", icon: "👥" },
  { title: "Launch birthday campaign", subtitle: "128 upcoming birthdays", revenue: "$850", icon: "🎁" },
  { title: "VIP promotion for top customers", subtitle: "87 VIPs · increase visit frequency", revenue: "$1,140", icon: "⭐" },
];
const valueItems = [
  ["/More_Revenue.png", "More Revenue", "Focus on what matters most"],
  ["/Save_Time.png", "Save Time", "Yara works 24/7 for you"],
  ["/Proven_Results.png", "Proven Results", "See every dollar generated"],
  ["/Secure_Compliant.png", "Secure & Compliant", "Your data is always protected"],
];
const steps: [string, string, string][] = [
  ["/Connect_Your_POS.png", "Connect your POS", "Securely connect Square, Clover, or Toast in minutes."],
  ["/Tell_Yara_Your_Goal.png", "Tell Yara your goal", "Set your monthly revenue goal and let Yara get to work."],
  ["/Yara_Finds_Opportunities.png", "Yara finds opportunities", "AI analyzes your data to find high-impact opportunities."],
  ["/Yara_Takes_Action.png", "Yara takes action", "She runs personalized campaigns and promotions."],
  ["/See_Every_Dollar.png", "See every dollar", "Track exactly how much revenue she generates."],
];
const features = [
  ["/AI_Powered_Opportunities.png", "AI-Powered Opportunities", "Yara analyzes your data to identify the best opportunities to grow revenue."],
  ["/Smart_Campaigns.png", "Smart Campaigns", "Personalized messages that bring customers back and drive visits."],
  ["/Revenue_Goal_Tracking.png", "Revenue Goal Tracking", "Set revenue goals and track progress in real time."],
  ["/Customer_Insights.png", "Customer Insights", "Understand your customers and what actually works."],
  ["/Automated_Execution.png", "Automated Execution", "Yara runs approved campaigns so you can focus on your business."],
  ["/Reachable_Customers.png", "Reachable Customers", "Grow your customer base with QR capture and opt-in flows."],
];
const commandPoints = [
  "Real-time revenue tracking",
  "Revenue gap and forecast",
  "Top opportunities from Yara",
  "Campaign and performance insights",
];
const pricing = [
  { name: "Starter", price: "$97", desc: "For getting started", features: ["Up to 1,000 customers", "Email campaigns", "Basic reporting", "1 POS connection"] },
  { name: "Core", price: "$297", desc: "Everything you need to grow", popular: true, features: ["Up to 5,000 customers", "SMS + email campaigns", "AI opportunities", "Advanced reporting", "Up to 2 POS connections"] },
  { name: "Brain", price: "$597", desc: "For growing businesses", features: ["Up to 15,000 customers", "All campaign types", "AI revenue forecasting", "Priority support", "Up to 3 POS connections"] },
  { name: "Empire", price: "$1,197", desc: "For multi-location businesses", features: ["Unlimited customers", "All features included", "Multi-location analytics", "Dedicated support", "Unlimited POS connections"] },
];
const faqs: [string, string][] = [
  ["How does the 3x ROI guarantee work?", "If Yara doesn't generate at least 3× your subscription cost in verified, control-group-attributed revenue within 60 days, you're eligible for a refund. See our terms for full eligibility details."],
  ["Which POS systems do you support?", "RevOverflow connects to Square, Clover, and Toast today, with more POS integrations coming soon."],
  ["How long does setup take?", "Under 5 minutes. Connect your POS, set a revenue goal, and Yara starts finding opportunities the same day — no technical setup required."],
  ["Can I cancel anytime?", "Yes. There are no contracts — you can cancel anytime from your account settings."],
];

function Button({ children, variant = "primary", href }: { children: ReactNode; variant?: "primary" | "secondary"; href?: string }) {
  const cls =
    variant === "primary"
      ? "inline-block text-center rounded-2xl bg-violet-600 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-violet-200 transition hover:bg-violet-700"
      : "inline-block text-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-bold text-slate-900 transition hover:bg-slate-50";
  return href ? <Link href={href} className={cls}>{children}</Link> : <button className={cls}>{children}</button>;
}

function RevenueLineChart() {
  const gen = "0,70 30,64 60,66 90,52 120,55 150,42 180,46 210,30 240,34 270,20 300,24 320,16";
  const fc = "0,74 40,66 80,60 120,52 160,46 200,38 240,30 280,22 320,12";
  return (
    <svg viewBox="0 0 320 90" preserveAspectRatio="none" className="h-28 w-full">
      <polyline points={fc} fill="none" stroke="#a78bfa" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
      <polyline points={gen} fill="none" stroke="#7c5cfc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spark({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 26" preserveAspectRatio="none" className="mt-2 h-6 w-full">
      <polygon points="0,20 14,16 28,18 42,11 56,14 70,7 84,9 100,3 100,26 0,26" fill={color} opacity="0.14" />
      <polyline points="0,20 14,16 28,18 42,11 56,14 70,7 84,9 100,3" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const kpiIcons = ["🎯", "📈", "⚡"];

function DashboardMockup() {
  return (
    <div className="rounded-3xl border border-violet-100 bg-white p-3.5 shadow-2xl shadow-violet-100">
      <div className="grid gap-3 lg:grid-cols-[112px_1fr_124px]">
        <aside className="hidden rounded-2xl bg-slate-50 p-2.5 lg:block">
          <img src="/ro-icon.png" alt="" className="mb-4 h-6 w-6 rounded-md" />
          {["Overview", "Opportunities", "Campaigns", "Customers", "Revenue", "Reports", "Settings"].map((item, i) => (
            <div key={item} className={`mb-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${i === 0 ? "bg-violet-100 text-violet-700" : "text-slate-500"}`}>{item}</div>
          ))}
          <div className="mt-4 rounded-xl border border-violet-100 bg-white p-2.5">
            <p className="text-[11px] font-bold text-slate-900">Yara 🟢</p>
            <p className="text-[9px] text-slate-500">AI Revenue Manager</p>
            <Spark color="#7c5cfc" />
          </div>
        </aside>

        <main className="min-w-0">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-950">Good morning, Alex 👋</h3>
              <p className="text-[11px] text-slate-500">Here’s how you’re doing this month.</p>
            </div>
            <div className="hidden shrink-0 gap-1.5 sm:flex">
              <span className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500">This month</span>
              <span className="rounded-lg border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500">All locations</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {metrics.map((metric, i) => (
              <div key={metric.label} className="rounded-xl border border-slate-100 p-2.5">
                <div className="flex items-start justify-between">
                  <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">{metric.label}</p>
                  <span className="grid h-4 w-4 place-items-center rounded-md bg-violet-50 text-[8px]">{kpiIcons[i]}</span>
                </div>
                <p className="mt-1 text-sm font-black text-slate-950">{metric.value}</p>
                <p className={`mt-0.5 text-[9px] font-bold ${i === 0 ? "text-violet-600" : i === 1 ? "text-emerald-600" : "text-slate-500"}`}>{metric.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-slate-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-950">Yara’s Plan</span>
                <span className="rounded-md bg-violet-600 px-1.5 py-0.5 text-[8px] font-black text-white">AI</span>
              </div>
              <span className="text-[10px] font-bold text-violet-600">View all</span>
            </div>
            <p className="mb-2 text-[9px] text-slate-500">Top opportunities to close your revenue gap.</p>
            <div className="space-y-2">
              {planItems.map((item) => (
                <div key={item.title} className="flex items-center gap-2 rounded-xl border border-slate-100 p-2">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-sm">{item.icon}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-black text-slate-950">{item.title}</p>
                    <p className="truncate text-[9px] text-slate-500">{item.subtitle}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[7px] text-slate-500">Est. revenue</p>
                    <p className="text-[11px] font-black text-emerald-600">{item.revenue}</p>
                  </div>
                  <span className="shrink-0 rounded-md border border-violet-300 px-2 py-1 text-[9px] font-bold text-violet-600">Review</span>
                </div>
              ))}
            </div>
          </div>
        </main>

        <aside className="hidden space-y-2.5 lg:block">
          <div className="rounded-xl border border-violet-100 p-2.5">
            <p className="text-[9px] font-bold text-slate-500">Revenue Generated</p>
            <p className="text-base font-black text-slate-950">$21,350</p>
            <Spark color="#7c5cfc" />
          </div>
          <div className="rounded-xl border border-violet-100 p-2.5">
            <p className="text-[9px] font-bold text-slate-500">Campaigns Running</p>
            <p className="text-base font-black text-slate-950">5 <span className="align-middle text-[9px] text-emerald-600">● live</span></p>
          </div>
          <div className="rounded-xl border border-violet-100 p-2.5">
            <p className="text-[9px] font-bold text-slate-500">Customers Reached</p>
            <p className="text-base font-black text-slate-950">2,374</p>
            <div className="mt-1.5 flex items-center">
              {["#7c5cfc", "#60a5fa", "#f472b6"].map((c, i) => (
                <span key={c} className="h-4 w-4 rounded-full border-2 border-white" style={{ background: c, marginLeft: i ? -7 : 0 }} />
              ))}
              <span className="ml-1 text-[9px] font-bold text-slate-500">+2.1k</span>
            </div>
          </div>
          <div className="rounded-xl border border-violet-100 p-2.5">
            <p className="text-[9px] font-bold text-slate-500">ROI This Month</p>
            <p className="text-base font-black text-slate-950">8.4x</p>
            <Spark color="#059669" />
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fbfaff] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center">
            <img src="/ro-full-logo.png" alt="RevOverflow" className="h-10 w-auto" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map(([item, href]) => (
              <a key={item} href={href} className="text-sm font-semibold text-slate-600 hover:text-slate-950">{item}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-semibold text-slate-700 md:block">Log in</Link>
            <Button href="/signup">Connect your POS →</Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pt-14 pb-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_#ddd6fe,_transparent_35%),radial-gradient(circle_at_left,_#f5f3ff,_transparent_30%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">✨ Meet Yara — your AI Revenue Manager</div>
            <h1 className="max-w-xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 md:text-5xl">
              Tell Yara Your Revenue Goal.
              <span className="mt-1 block">
                <span className="bg-gradient-to-r from-violet-500 to-violet-700 bg-clip-text text-transparent">She helps you </span>
                <span className="relative inline-block whitespace-nowrap bg-gradient-to-r from-violet-500 to-violet-700 bg-clip-text text-transparent">
                  hit it.
                  <svg viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-1.5 left-0 h-3 w-full">
                    <path d="M3 9 C 35 3, 85 3, 117 8" stroke="#7c5cfc" strokeWidth="5" fill="none" strokeLinecap="round" />
                  </svg>
                </span>
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-7 text-slate-500">
              Connect Square, Clover, or Toast and tell Yara how much revenue you want to make this month.
              She finds the opportunities, brings customers back, runs the promotions, and shows you every dollar she generates.
            </p>
            <p className="mt-5 text-base font-extrabold text-emerald-600">🛡 For less than the cost of one employee.</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Button href="/signup">Connect your POS — it’s free to start →</Button>
              <Button variant="secondary" href="#how-it-works">See how it works →</Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-5 text-sm font-semibold text-slate-500">
              <span>✓ No credit card</span><span>✓ Setup in minutes</span><span>✓ Cancel anytime</span>
            </div>
            <div className="mt-8 inline-flex items-center gap-7 rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 shadow-sm">
              <PosLogo name="Square" src="/square.png" h={18} color="#1e293b" />
              <PosLogo name="Clover" src="/clover.png" h={18} color="#059669" />
              <PosLogo name="Toast" src="/toast.png" h={18} color="#ea580c" />
            </div>
            <p className="mt-3 text-xs font-semibold text-violet-500">More POS integrations coming soon.</p>
          </div>
          <div className="relative" style={{ animation: "royfloat 5.5s ease-in-out infinite" }}>
            <style>{`@keyframes royfloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}`}</style>
            <div aria-hidden="true" className="absolute -inset-6 -z-10 rounded-[3rem] bg-violet-300/30 blur-3xl" />
            <DashboardMockup />
          </div>
        </div>
      </section>

      <section className="px-6">
        <div className="mx-auto grid max-w-7xl gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-violet-50 md:grid-cols-4">
          {valueItems.map(([icon, title, desc]) => (
            <div key={title} className="flex items-center gap-3 rounded-2xl p-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-violet-50">
                <img src={icon} alt="" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-slate-900">{title}</p>
                <p className="text-[13px] text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Set a goal. Yara does the rest.</h2>
          </div>
          <div className="mt-12 grid gap-x-6 gap-y-10 md:grid-cols-5">
            {steps.map(([icon, title, desc], i) => (
              <div key={title} className="relative">
                <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <img src={icon} alt="" className="h-14 w-14 object-contain" />
                  {i < steps.length - 1 && (
                    <span className="absolute hidden -translate-y-1/2 md:block" style={{ top: "2.5rem", left: "6rem" }} aria-hidden="true">
                      <svg width="40" height="12" viewBox="0 0 40 12" fill="none">
                        <line x1="0" y1="6" x2="30" y2="6" stroke="#c4b5fd" strokeWidth="2" strokeDasharray="4 4" />
                        <path d="M30 2 L36 6 L30 10" stroke="#c4b5fd" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                </div>
                <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{i + 1}</div>
                <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-6 pb-24">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-xs font-black uppercase tracking-widest text-violet-600">Meet Yara&apos;s team</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">A full team of revenue agents</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px] text-slate-500">Each one is a specialist Yara puts to work on a different way to grow your revenue.</p>
          <div className="mt-12 grid gap-5 md:grid-cols-3 lg:grid-cols-6">
            {agents.map(([src, fb, title, desc]) => (
              <div key={title} className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-violet-50">
                  <AgentIcon src={src} fallback={fb} className="h-11 w-11 object-contain" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-[13px] leading-5 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-12 lg:py-16">
          <div className="p-2 text-white md:p-6">
            <span className="inline-block rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-300">Why RevOverflow</span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Not another marketing tool. A revenue solution.</h2>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-300">Most tools help you send campaigns. RevOverflow helps you close revenue gaps.</p>
          </div>

          {/* Product window mockup */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex">
              {/* icon rail */}
              <div className="hidden w-9 shrink-0 flex-col items-center gap-3 border-r border-slate-100 py-4 sm:flex">
                {["🏠", "✦", "📣", "👥", "📊", "📄", "⚙️"].map((d, i) => (
                  <span key={i} className={`text-[11px] ${i === 0 ? "opacity-90" : "opacity-35"}`}>{d}</span>
                ))}
              </div>

              <div className="min-w-0 flex-1 p-4">
                {/* header */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">Traditional Marketing Tools</span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-500">RevOverflow ▾</span>
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-violet-50 text-[9px]">🔒</span>
                  </div>
                </div>

                {/* metric tiles */}
                <div className="grid grid-cols-4 gap-2">
                  {[["Revenue Goal", "$25,000", "Edit overrides", "text-violet-600"], ["Generated", "$21,350", "85% of goal", "text-emerald-600"], ["Gap Remaining", "$3,650", "4 days left", "text-slate-500"], ["Forecast", "$24,600", "90% of goal", "text-emerald-600"]].map(([l, v, s, c]) => (
                    <div key={l} className="rounded-xl border border-slate-100 p-2.5">
                      <p className="text-[8px] font-bold uppercase tracking-wide text-slate-500">{l}</p>
                      <p className="mt-1 text-sm font-black text-slate-950">{v}</p>
                      <p className={`mt-0.5 text-[8px] font-bold ${c}`}>{s}</p>
                    </div>
                  ))}
                </div>

                {/* chart + opportunities */}
                <div className="mt-3 grid gap-3 md:grid-cols-[1.4fr_1fr]">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[11px] font-bold text-slate-900">Revenue Over Time</p>
                      <p className="text-[8px] font-semibold text-slate-500">— Generated · <span className="text-violet-400">- - Forecast</span></p>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="flex flex-col justify-between py-0.5 text-[7px] text-slate-400">
                        <span>$30k</span><span>$20k</span><span>$10k</span><span>$0</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <RevenueLineChart />
                        <div className="mt-1 flex justify-between text-[7px] text-slate-400">
                          <span>May 1</span><span>May 8</span><span>May 15</span><span>May 22</span><span>May 29</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="mb-2 text-[11px] font-bold text-slate-900">Top Opportunities</p>
                    <div className="space-y-1.5">
                      {[["👥", "Win back inactive", "$2,480"], ["🎁", "Birthday campaign", "$850"], ["⭐", "VIP promotion", "$1,140"], ["💎", "Membership upgrade", "$2,950"]].map(([ic, t, r]) => (
                        <div key={t} className="flex items-center gap-1.5 text-[10px]">
                          <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-violet-50 text-[8px]">{ic}</span>
                          <span className="min-w-0 flex-1 truncate text-slate-600">{t}</span>
                          <span className="shrink-0 font-black text-emerald-600">{r}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-slate-100 pt-1.5 text-[10px]">
                        <span className="font-black text-slate-950">Total Potential</span>
                        <span className="font-black text-violet-600">$7,420</span>
                      </div>
                      <div className="mt-1 rounded-lg bg-violet-50 py-1.5 text-center text-[9px] font-bold text-violet-600">View all opportunities</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-violet-600">The command center</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Your business. Your goals. Yara keeps you on track.</h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">See your revenue at a glance, track progress toward your goal, and watch Yara close the gap — all in one place.</p>
            <ul className="mt-7 space-y-4">
              {commandPoints.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-sm font-black text-emerald-600">✓</span>
                  <span className="font-bold text-slate-700">{p}</span>
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-8 inline-block rounded-2xl border border-violet-200 px-6 py-4 text-sm font-black text-violet-700 hover:bg-violet-50">Explore the dashboard →</Link>
          </div>
          <DashboardMockup />
        </div>
      </section>

      <section id="pricing" className="px-6 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-violet-600">Simple pricing</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Choose the plan that fits your business</h2>
            <p className="mt-3 text-slate-500">Start free. Upgrade anytime. Cancel anytime.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {pricing.map((plan) => (
              <div key={plan.name} className={`relative rounded-3xl border bg-white p-7 shadow-sm ${plan.popular ? "border-violet-400 shadow-xl shadow-violet-100" : "border-slate-100"}`}>
                {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-4 py-1 text-xs font-black text-white">Most Popular</div>}
                <h3 className="text-xl font-black">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{plan.desc}</p>
                <div className="mt-6"><span className="text-4xl font-black">{plan.price}</span><span className="text-slate-500"> /month</span></div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (<li key={f} className="text-sm font-semibold text-slate-600">✓ {f}</li>))}
                </ul>
                <Link href="/signup" className={`mt-8 block w-full rounded-2xl px-5 py-4 text-center text-sm font-black ${plan.popular ? "bg-violet-600 text-white" : "border border-violet-200 text-violet-700"}`}>Start free</Link>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm font-bold text-violet-700">3x ROI Guarantee: Get 3x your investment back in 60 days or your money back.</p>
        </div>
      </section>

      <section id="faq" className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-widest text-violet-600">FAQ</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          </div>
          <div className="mt-10 grid items-start gap-3 md:grid-cols-2">
            {faqs.map(([q, a]) => (
              <details key={q} className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                  <span>{q}</span>
                  <span className="ml-4 shrink-0 text-xl leading-none text-violet-600 transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-500">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 rounded-[2rem] bg-gradient-to-r from-violet-700 to-indigo-700 p-8 text-white shadow-2xl shadow-violet-200 md:flex-row md:p-12">
          <div>
            <h2 className="text-3xl font-bold">Ready to hit your revenue goal?</h2>
            <p className="mt-2 text-violet-100">Connect your POS in minutes and let Yara find your opportunities.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" href="/signup">Connect your POS — it’s free</Button>
            <Link href="#how-it-works" className="inline-block rounded-2xl border border-white/30 px-6 py-4 text-sm font-bold text-white">See how it works</Link>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 px-6 py-14 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-extrabold tracking-tight text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>RevOverflow</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">Yara is your AI Revenue Manager, helping local businesses grow revenue with the power of AI.</p>
          </div>
          {[
            { title: "Product", links: [["How it works", "#how-it-works"], ["Features", "#features"], ["Pricing", "#pricing"], ["Log in", "/login"]] },
            { title: "Resources", links: [["FAQ", "#faq"], ["Get started", "/signup"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
            { title: "Get started", links: [["Connect your POS", "/signup"], ["Pricing", "#pricing"]] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="font-black">{col.title}</h4>
              <div className="mt-4 space-y-3">
                {col.links.map(([link, href]) => (
                  <Link key={link} href={href} className="block text-sm text-slate-400 hover:text-white">{link}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 pt-6 text-center text-sm text-slate-500">© 2026 RevOverflow. All rights reserved.</div>
      </footer>
    </main>
  );
}
