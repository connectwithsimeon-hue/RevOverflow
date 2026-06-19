'use client'

// Next.js App Router's top-level error boundary — catches any error that
// escapes a page/layout and would otherwise just show a blank screen.
// Reports it to Sentry, then shows the merchant something less scary than
// a white page. Docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body style={{ background: '#F7F7FB', color: '#15151F', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Something went wrong</h1>
          <p style={{ color: 'rgba(21,21,31,0.6)', marginBottom: '1.5rem' }}>
            We've been notified and are looking into it. Try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ background: '#7c5cfc', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  )
}
