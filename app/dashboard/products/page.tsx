import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import DashboardSidebar from '@/app/components/DashboardSidebar'
import ProductCostEditor from '@/app/components/ProductCostEditor'

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
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
      <DashboardSidebar active="products" plan={merchant.plan} />
      <main style={{ flex: 1, minWidth: 0 }}>
        <div className="max-w-5xl px-8 py-8">
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.375rem' }}>
            Products &amp; Margins
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: 640, marginBottom: '2rem' }}>
            Your POS tells Yara what each product <em>sells</em> for, but not what it <em>costs</em> you. Add your cost per product and Yara
            becomes margin-aware — promoting your most profitable items and never discounting the thin-margin ones.
          </p>
          <ProductCostEditor />
        </div>
      </main>
    </div>
  )
}
