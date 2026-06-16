// This file configures the initialization of Sentry for edge runtime
// features (middleware, edge API routes). Most of RevOverflow's API routes
// run on the standard Node runtime (sentry.server.config.ts covers those);
// this only matters if a route opts into `export const runtime = 'edge'`.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
})
