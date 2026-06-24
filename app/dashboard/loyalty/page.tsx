import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import LoyaltyEditor from '@/app/components/LoyaltyEditor'

export const dynamic = 'force-dynamic'

export default async function LoyaltyPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('plan')
    .eq('auth_user_id', user.id)
    .single()
  if (!merchant) redirect('/login')

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex' }}>
      <DashboardSidebar active="loyalty" plan={merchant.plan} />
      <main style={{ flex: 1, minWidth: 0 }}>
        <div className="max-w-5xl px-8 py-8">
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.375rem' }}>
            Loyalty
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: 640, marginBottom: '2rem' }}>
            A simple punch-card that runs itself — no extra app, no Square Loyalty needed. Set a reward, and Yara tracks every
            customer&apos;s visits and nudges the ones who are close, bringing them back to earn it.
          </p>
          <LoyaltyEditor />
        </div>
      </main>
    </div>
  )
}
