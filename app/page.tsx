// app/page.tsx
import type { ReactNode } from "react";
import Link from "next/link";
import PosLogo from "./components/PosLogo";

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
  ["📈", "More Revenue", "Focus on what matters most"],
  ["⚡", "Save Time", "Yara works 24/7 for you"],
  ["🛡️", "Proven Results", "See every dollar generated"],
  ["🔒", "Secure & Compliant", "Your data is always protected"],
];
const steps: [string, string, string][] = [
  ["🔌", "Connect your POS", "Securely connect Square, Clover, or Toast in minutes."],
  ["🎯", "Tell Yara your goal", "Set your monthly revenue goal and let Yara get to work."],
  ["🧠", "Yara finds opportunities", "AI analyzes your data to find high-impact opportunities."],
  ["✈️", "Yara takes action", "She runs personalized campaigns and promotions."],
  ["📈", "See every dollar", "Track exactly how much revenue she generates."],
];
const features = [
  ["🧠", "AI-Powered Opportunities", "Yara analyzes your data to identify the best opportunities to grow revenue."],
  ["💬", "Smart Campaigns", "Personalized messages that bring customers back and drive visits."],
  ["🎯", "Revenue Goal Tracking", "Set revenue goals and track progress in real time."],
  ["👤", "Customer Insights", "Understand your customers and what actually works."],
  ["⚡", "Automated Execution", "Yara runs approved campaigns so you can focus on your business."],
  ["📲", "Reachable Customers", "Grow your customer base with QR capture and opt-in flows."],
];
const topOpps: [string, string][] = [
  ["Win back inactive", "$2,480"],
  ["Birthday campaign", "$850"],
  ["VIP promotion", "$1,140"],
  ["Membership upgrade", "$2,950"],
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
const faqs = [
  "How does the 3x ROI guarantee work?",
  "Which POS systems do you support?",
  "How long does setup take?",
  "Can I cancel anytime?",
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

function DashboardMockup() {
  return (
    <div className="relative rounded-[2rem] border border-violet-100 bg-white/90 p-5 shadow-2xl shadow-violet-100 backdrop-blur">
      <div className="grid gap-4 lg:grid-cols-[150px_1fr_150px]">
        <aside className="hidden rounded-3xl bg-slate-50 p-4 lg:block">
          <img src="/ro-icon.png" alt="RevOverflow" className="mb-8 h-7 w-7 rounded-lg" />
          {["Overview", "Opportunities", "Campaigns", "Customers", "Revenue", "Reports", "Settings"].map((item, i) => (
            <div key={item} className={`mb-2 rounded-xl px-3 py-3 text-xs font-semibold ${i === 0 ? "bg-violet-100 text-violet-700" : "text-slate-500"}`}>{item}</div>
          ))}
          <div className="mt-10 rounded-2xl border border-violet-100 bg-white p-3">
            <p className="text-xs font-bold text-slate-900">Yara 🟢</p>
            <p className="text-[10px] text-slate-500">AI Revenue Manager</p>
            <div className="mt-4 h-14 rounded-xl bg-gradient-to-t from-violet-200 to-white" />
          </div>
        </aside>
        <main>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-slate-950">Good morning, Alex 👋</h3>
              <p className="text-sm text-slate-500">Here’s how you’re doing this month.</p>
            </div>
            <div className="hidden gap-2 md:flex">
              <span className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500">This month</span>
              <span className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500">All locations</span>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
                <p className="mt-3 text-2xl font-black text-slate-950">{metric.value}</p>
                <p className="mt-2 text-xs font-bold text-violet-600">{metric.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-black text-slate-950">Yara’s Plan <span className="rounded-full bg-violet-100 px-2 py-1 text-xs text-violet-700">AI</span></h4>
                <p className="text-sm text-slate-500">Top opportunities to close your revenue gap.</p>
              </div>
              <span className="text-sm font-bold text-violet-600">View all</span>
            </div>
            <div className="space-y-3">
              {planItems.map((item) => (
                <div key={item.title} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50">{item.icon}</div>
                    <div>
                      <p className="text-sm font-black text-slate-950">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.subtitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Est. revenue</p>
                    <p className="font-black text-emerald-600">{item.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <aside className="hidden space-y-4 lg:block">
          {[["Revenue Generated", "$21,350"], ["Campaigns Running", "5"], ["Customers Reached", "2,374"], ["ROI This Month", "8.4x"]].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
              <div className="mt-4 h-8 rounded-xl bg-gradient-to-r from-violet-100 via-white to-emerald-100" />
            </div>
          ))}
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
          <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <img src="/ro-icon.png" alt="" className="h-7 w-7 rounded-lg" />
            <span><span className="text-slate-950">Rev</span><span className="text-violet-600">Overflow</span></span>
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

      <section className="relative overflow-hidden px-6 py-20">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_#ddd6fe,_transparent_35%),radial-gradient(circle_at_left,_#f5f3ff,_transparent_30%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">✨ Meet Yara — your AI Revenue Manager</div>
            <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-7xl">
              Tell Yara Your Revenue Goal.
              <span className="block bg-gradient-to-r from-violet-500 to-violet-700 bg-clip-text text-transparent">She helps you hit it.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
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
            <div className="mt-8 flex max-w-md items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <PosLogo name="Square" src="/square.png" h={22} color="#1e293b" />
              <PosLogo name="Clover" src="/clover.png" h={22} color="#059669" />
              <PosLogo name="Toast" src="/toast.png" h={22} color="#ea580c" />
            </div>
            <p className="mt-3 text-xs font-semibold text-violet-500">More POS integrations coming soon.</p>
          </div>
          <DashboardMockup />
        </div>
      </section>

      <section className="px-6">
        <div className="mx-auto grid max-w-7xl gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-violet-50 md:grid-cols-4">
          {valueItems.map(([icon, title, desc]) => (
            <div key={title} className="flex items-center gap-4 rounded-2xl p-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-50 text-xl">{icon}</div>
              <div>
                <p className="font-black">{title}</p>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-6 py-24">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-xs font-black uppercase tracking-widest text-violet-600">How it works</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Set a goal. Yara does the rest.</h2>
          <div className="mt-14 grid gap-x-4 gap-y-12 md:grid-cols-5">
            {steps.map(([icon, title, desc], i) => (
              <div key={title} className="relative text-center">
                <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-violet-50 text-2xl">
                  {icon}
                  {i < steps.length - 1 && (
                    <span className="absolute top-1/2 hidden -translate-y-1/2 text-2xl font-black text-violet-200 md:block" style={{ left: "calc(100% + 0.5rem)" }}>→</span>
                  )}
                </div>
                <div className="mt-5 inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">Step {i + 1}</div>
                <h3 className="mt-3 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="px-6 pb-24">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-xs font-black uppercase tracking-widest text-violet-600">Built for local businesses</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Everything you need to grow revenue</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3 lg:grid-cols-6">
            {features.map(([icon, title, desc]) => (
              <div key={title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-violet-50 text-2xl">{icon}</div>
                <h3 className="font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-7xl items-center gap-8 overflow-hidden rounded-[2rem] bg-slate-950 p-6 lg:grid-cols-2 lg:p-10">
          <div className="p-4 text-white md:p-8">
            <p className="text-xs font-black uppercase tracking-widest text-violet-300">Why RevOverflow</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight">Not another marketing tool. A revenue solution.</h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">Most tools measure opens and clicks. RevOverflow measures revenue — and tells Yara exactly where to find more of it.</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-2xl">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[["Revenue Goal", "$25,000", ""], ["Generated", "$21,350", "85% of goal"], ["Gap Remaining", "$3,650", "4 days left"], ["Forecast", "$24,600", "90% of goal"]].map(([l, v, s]) => (
                <div key={l} className="rounded-2xl border border-slate-100 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{l}</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{v}</p>
                  {s && <p className="text-[11px] font-bold text-emerald-600">{s}</p>}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-black text-slate-950">Revenue Over Time</p>
                <p className="text-xs font-bold text-slate-500">Generated · <span className="text-violet-400">Forecast</span></p>
              </div>
              <RevenueLineChart />
            </div>
            <div className="mt-4 rounded-2xl border border-slate-100 p-4">
              <p className="mb-3 text-sm font-black text-slate-950">Top Opportunities</p>
              <div className="space-y-2">
                {topOpps.map(([t, r]) => (
                  <div key={t} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{t}</span>
                    <span className="font-black text-emerald-600">{r}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
                  <span className="font-black text-slate-950">Total Potential</span>
                  <span className="font-black text-violet-600">$7,420</span>
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
            <h2 className="mt-3 text-4xl font-black tracking-tight">Your business. Your goals. Yara keeps you on track.</h2>
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
            <h2 className="mt-3 text-4xl font-black tracking-tight">Choose the plan that fits your business</h2>
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
            <h2 className="mt-3 text-4xl font-black tracking-tight">Frequently asked questions</h2>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {faqs.map((q) => (
              <div key={q} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-5 font-bold shadow-sm">
                {q}<span className="text-violet-600">+</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 rounded-[2rem] bg-gradient-to-r from-violet-700 to-indigo-700 p-8 text-white shadow-2xl shadow-violet-200 md:flex-row md:p-12">
          <div>
            <h2 className="text-3xl font-black">Ready to hit your revenue goal?</h2>
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
            <Link href="/" className="flex items-center gap-2 text-2xl font-black">
              <img src="/ro-icon.png" alt="" className="h-7 w-7 rounded-lg" />
              <span>Rev<span className="text-violet-400">Overflow</span></span>
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
