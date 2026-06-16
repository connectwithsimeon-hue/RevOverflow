// This file configures the initialization of Sentry on the server.
// Runs once per server "instance" (cold start) before any request is handled.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Sample 10% of requests for performance tracing.
  tracesSampleRate: 0.1,

  enabled: process.env.NODE_ENV === 'production',

  integrations: [
    // The codebase has console.error(...) calls scattered across every
    // sync/webhook/campaign route (Square, Clover, Toast, Telnyx, etc.).
    // This forwards those straight to Sentry too, so existing error
    // handling becomes monitored without having to touch every file.
    Sentry.captureConsoleIntegration({ levels: ['error'] }),
  ],
})
