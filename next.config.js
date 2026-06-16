const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
}

// withSentryConfig uploads source maps to Sentry at build time so stack
// traces in production show real file/line numbers instead of minified
// code. If SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT aren't set yet
// (Simeon hasn't pasted them into Vercel), this step is silently skipped
// rather than failing the build — error reporting still works either way,
// just with less readable stack traces until those are added.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
})
