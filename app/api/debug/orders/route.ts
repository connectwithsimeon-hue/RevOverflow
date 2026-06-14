import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/encryption'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const service = createServiceClient()
  const { data: merchant } = await service
    .from('merchants')
    .select('id, square_access_token, square_merchant_id')
    .eq('auth_user_id', user.id)
    .single()

  if (!merchant) return NextResponse.json({ error: 'No merchant' }, { status: 404 })

  const accessToken = decrypt(merchant.square_access_token as string)
  const squareBase = 'https://connect.squareupsandbox.com'
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Square-Version': '2024-01-17',
    'Content-Type': 'application/json',
  }

  // Get locations
  const locRes = await fetch(`${squareBase}/v2/locations`, { headers })
  const locData = await locRes.json()
  const locationIds = (locData.locations || []).map((l: any) => l.id)

  // Try orders search with NO filters
  const searchRes = await fetch(`${squareBase}/v2/orders/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      location_ids: locationIds,
      limit: 5,
    }),
  })
  const searchData = await searchRes.json()

  // Also try listing customers to confirm token works
  const custRes = await fetch(`${squareBase}/v2/customers?limit=3`, { headers })
  const custData = await custRes.json()

  return NextResponse.json({
    merchantId: merchant.square_merchant_id,
    locationIds,
    orderSearch: {
      status: searchRes.status,
      orderCount: searchData.orders?.length ?? 0,
      errors: searchData.errors ?? null,
      sample: searchData.orders?.slice(0, 2) ?? [],
    },
    customerCheck: {
      count: custData.customers?.length ?? 0,
      errors: custData.errors ?? null,
    },
  }, { status: 200 })
}
