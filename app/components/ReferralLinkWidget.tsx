/**
 * ReferralLinkWidget — client component shown on the Account page.
 * Fetches (or generates) the merchant's unique referral link, then lets them copy it.
 */
'use client'

import { useState, useEffect } from 'react'

interface Props {
  merchantId: string
  referralToken?: string | null
  vipSlug?: string | null
}

export default function ReferralLinkWidget({ merchantId, referralToken, vipSlug }: Props) {
  const [link, setLink]       = useState<string>('')
  const [copied, setCopied]   = useState(false)
  const [loading, setLoading] = useState(!referralToken)

  useEffect(() => {
    if (referralToken && vipSlug) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://revoverflow.com'
      setLink(`${appUrl}/refer/${referralToken}?slug=${vipSlug}`)
      setLoading(false)
      return
    }
    // Fetch / generate token from API
    fetch('/api/referral/link')
      .then(r => r.json())
      .then(d => { if (d.link) setLink(d.link) })
      .finally(() => setLoading(false))
  }, [referralToken, vipSlug])

  function copyLink() {
    if (!link) return
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Generating referral link…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: 'var(--ink)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '0.75rem 1rem',
        flexWrap: 'wrap',
      }}>
        <span style={{ flex: 1, fontSize: '0.9375rem', color: 'var(--violet)', wordBreak: 'break-all', minWidth: 0 }}>
          {link}
        </span>
        <button
          onClick={copyLink}
          style={{
            background: copied ? 'rgba(74,222,128,0.15)' : 'var(--violet)',
            color: copied ? '#4ade80' : '#fff',
            border: copied ? '1px solid rgba(74,222,128,0.3)' : 'none',
            borderRadius: '8px', padding: '0.5rem 1rem',
            fontWeight: 700, fontSize: '0.875rem',
            cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy link'}
        </button>
      </div>
      <p style={{ color: 'rgba(21,21,31,0.4)', fontSize: '0.8125rem', margin: 0 }}>
        Share this link via text, email, or post it on your social media.
        Every new signup is tracked — you can see referral activity in your outcome log.
      </p>
    </div>
  )
}
