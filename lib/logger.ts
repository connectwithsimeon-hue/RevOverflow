/**
 * Shared logger — ships structured logs to BetterStack (Logtail) in
 * production so Simeon can search/filter logs from the BetterStack
 * dashboard instead of digging through Vercel's function logs.
 *
 * Falls back to plain console output if BETTERSTACK_SOURCE_TOKEN isn't
 * set yet (e.g. local dev, or before Simeon has created a BetterStack
 * source) — logging never throws and never blocks the request.
 *
 * Env var (Simeon pastes into .env.local / Vercel — never in chat):
 *   BETTERSTACK_SOURCE_TOKEN   — from BetterStack → Logs → your source → "Source Token"
 */

import { Logtail } from '@logtail/node'

const token = process.env.BETTERSTACK_SOURCE_TOKEN

const logtail = token ? new Logtail(token) : null

function safeLog(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
  // Always log to console too — this is what shows up in Vercel's own logs.
  const consoleFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  consoleFn(`[${level}]`, message, context ?? '')

  if (logtail) {
    logtail[level](message, context).catch(() => {
      // Never let a logging failure break the request that triggered it.
    })
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => safeLog('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => safeLog('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => safeLog('error', message, context),
}
