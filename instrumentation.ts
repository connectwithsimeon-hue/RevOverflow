// Next.js calls register() once per server runtime at startup. We use it to
// load the right Sentry config for that runtime (Node API routes vs. edge
// middleware) — see sentry.server.config.ts / sentry.edge.config.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
