// This file configures the initialization of Sentry on the client (browser).
// Runs once when the app loads in the user's browser, before any other code.
// Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Catch ~10% of normal sessions for performance tracing — cheap, gives
  // a sample of real-world page load / API timing without flooding Sentry.
  tracesSampleRate: 0.1,

  // Capture session replays only when something actually errors, so we
  // get a recording of what the merchant was doing right before the crash.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Don't spam Sentry with noise in local dev.
  enabled: process.env.NODE_ENV === 'production',
})
