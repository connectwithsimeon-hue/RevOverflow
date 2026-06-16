/**
 * GET /api/health
 *
 * Point a BetterStack Uptime monitor at this URL:
 *   https://www.revoverflow.com/api/health
 *
 * BetterStack → Uptime → Create monitor → paste the URL above → check
 * every 1–3 min → set alert contacts (email/SMS/phone call). It will
 * page Simeon if this ever returns a non-200 or times out.
 *
 * Checks that the database is actually reachable (not just that the
 * server process is up) — a hung Supabase connection should count as
 * "down" even though Vercel would otherwise serve a 200 for a static page.
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const startedAt = Date.now()

  try {
    const service = createServiceClient()
    const { error } = await service.from('merchants').select('id', { count: 'exact', head: true }).limit(1)

    if (error) {
      return NextResponse.json(
        { status: 'down', check: 'database', error: error.message },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { status: 'down', check: 'database', error: err?.message ?? 'unknown error' },
      { status: 503 }
    )
  }
}
