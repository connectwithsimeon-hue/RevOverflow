/**
 * AgentIcon — shows a dedicated agent icon if its file exists in /public,
 * otherwise falls back to a related existing icon. Drop the named agent
 * images into public/ and they replace the fallbacks automatically.
 */
'use client'

import { useState } from 'react'

export default function AgentIcon({ src, fallback, className }: { src: string; fallback: string; className?: string }) {
  const [current, setCurrent] = useState(src)
  return (
    <img
      src={current}
      alt=""
      className={className}
      onError={() => { if (current !== fallback) setCurrent(fallback) }}
    />
  )
}
