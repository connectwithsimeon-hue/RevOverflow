import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import DecalOrderWidget from '@/app/components/DecalOrderWidget'

export default async function DecalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, business_name, plan')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) redirect('/login')

  const eligible = !!merchant.plan && merchant.plan !== 'starter'

  return (
    <div style={{ backgroundColor: 'var(--ink)', minHeight: '100vh', color: 'var(--text-primary)', display: 'flex' }}>
      <DashboardSidebar active="decals" plan={merchant.plan} />

      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          height: 72, borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 40,
          backgroundColor: 'rgba(247,247,251,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>In-Store</div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1.0625rem' }}>
              Decals & Glass Prints
            </div>
          </div>
        </div>

        <div className="max-w-3xl px-8 py-8">
          <div className="mb-8">
            <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.375rem' }}>
              Turn walk-ins into reachable customers
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '560px' }}>
              A counter card (just sits by the register, no adhesive) or a window sticker, printed with a QR code
              straight to your VIP signup page. Customers scan, sign up, and the next time they pay you, Yara
              already has their contact info. Free with your plan — we print and ship it to you.
            </p>
          </div>

          <DecalOrderWidget merchantBusinessName={merchant.business_name} eligible={eligible} />
        </div>
      </main>
    </div>
  )
}
