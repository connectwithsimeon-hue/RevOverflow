import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import MembershipEditor from '@/app/components/MembershipEditor'

export const dynamic = 'force-dynamic'

export default async function MembershipPage() {
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
      <DashboardSidebar active="membership" plan={merchant.plan} />
      <main style={{ flex: 1, minWidth: 0 }}>
        <div className="max-w-5xl px-8 py-8">
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.375rem' }}>
            Membership
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: 640, marginBottom: '2rem' }}>
            Turn your regulars into predictable recurring revenue. Define your offer here, and Yara will promote it to the
            customers most likely to join — sending them straight to your own signup link.
          </p>
          <MembershipEditor />
        </div>
      </main>
    </div>
  )
}
