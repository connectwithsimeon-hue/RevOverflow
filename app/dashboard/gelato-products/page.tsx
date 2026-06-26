import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GelatoProductFinder from '@/app/components/GelatoProductFinder'

export const dynamic = 'force-dynamic'

export default async function GelatoProductsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7fb', color: '#1a1b2e' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, margin: '0 0 6px' }}>
          Find your Gelato product IDs
        </h1>
        <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6, margin: '0 0 28px' }}>
          Pick a category, then copy the product ID for the counter card and the window sticker.
          Paste each into the matching Vercel environment variable, then redeploy.
        </p>
        <GelatoProductFinder />
      </div>
    </div>
  )
}
