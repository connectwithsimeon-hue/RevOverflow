/**
 * PosLogo — renders a real POS logo image, falling back to clean brand text
 * until the image file is added to /public. Drop square.png / clover.png /
 * toast.png into public/ and the real marks appear automatically.
 */
'use client'

import { useState } from 'react'

export default function PosLogo({ name, src, h = 22, color }: { name: string; src: string; h?: number; color?: string }) {
  const [err, setErr] = useState(false)
  if (err) {
    return <span className="font-black" style={{ fontSize: '0.95rem', color: color || '#0f172a' }}>{name}</span>
  }
  return (
    <img
      src={src}
      alt={name}
      style={{ height: h, width: 'auto', objectFit: 'contain' }}
      onError={() => setErr(true)}
    />
  )
}
