/**
 * Counter Card / Window Sticker Design Generator
 *
 * Builds a print-ready SVG for the "Join Our Rewards" card layout — two-line
 * headline, divider, body copy, a row of three perk icons, a QR code (the
 * merchant's real VIP signup link, lib/vip-slug.ts), a CTA pill, and a
 * "Powered by RevOverflow" footer.
 *
 * Branding rule: this file never draws or recreates a logo. The header slot
 * always embeds a real image —
 *  - the merchant's own uploaded logo (merchants.logo_url, set from
 *    Account → Branding), fetched and base64-embedded as-is, OR
 *  - if they haven't uploaded one, the real RevOverflow icon file
 *    (public/ro-icon.png) plus the "RevOverflow" wordmark text.
 * No part of either logo is ever hand-drawn/approximated in code.
 *
 * Two physical products, with different aspect ratios (4:6 vs 8:10), so each
 * theme carries its own explicit vertical layout (not a single shared scale
 * factor) — that's what keeps the QR code / CTA button / footer from
 * overflowing past the bottom edge of the card.
 *
 *  - table_decal: a flat paper card that just sits at the counter — NOT
 *    adhesive. 4in x 6in portrait (dark theme), maps to a Gelato
 *    "Postcard" / card-stock product.
 *  - glass_print: an adhesive sticker for storefront glass or doors.
 *    8in x 10in portrait (light theme), maps to a Gelato "Sticker" product.
 */

import QRCode from 'qrcode'
import { readFile } from 'fs/promises'
import path from 'path'

export type DecalProductType = 'table_decal' | 'glass_print'

interface DesignParams {
  businessName: string
  vipUrl: string
  productType: DecalProductType
  /** Merchant's uploaded logo URL (merchants.logo_url). Null/undefined → fall back to the default RevOverflow icon. */
  logoUrl?: string | null
}

interface LayoutConfig {
  topMargin: number
  badgeSize: number
  wordmarkFontSize: number
  logoBoxMaxW: number
  gapAfterLogo: number
  headlineFontSize1: number
  headlineFontSize2: number
  gapHeadlineLines: number
  gapAfterHeadline: number
  dividerFontSize: number
  gapAfterDivider: number
  bodyFontSize: number
  gapAfterBody: number
  perkIconR: number
  perkLabelFontSize: number
  gapAfterPerks: number
  qrSize: number
  qrBoxPad: number
  gapAfterQr: number
  ctaW: number
  ctaH: number
  ctaFontSize: number
  gapAfterCta: number
  footerNoteFontSize: number
  footerFontSize: number
  cornerRadius: number
  strokeScale: number
}

interface ThemeConfig {
  width: number
  height: number
  bg: string
  headlineColor: string
  bodyColor: string
  footerColor: string
  headlineLine1: string
  headlineLine2: string
  dividerLabel: string
  bodyText: string
  perks: { icon: 'star' | 'gift' | 'bell'; label: string }[]
  footerNote?: string
  layout: LayoutConfig
}

const VIOLET = '#7C5CFC'

const THEME: Record<DecalProductType, ThemeConfig> = {
  table_decal: {
    width: 420, // A5 width (~5.8in / 148mm)
    height: 595, // A5 height (~8.3in / 210mm)
    bg: '#16151f',
    headlineColor: '#ffffff',
    bodyColor: '#aab0c2',
    footerColor: '#8b91a6',
    headlineLine1: 'JOIN OUR',
    headlineLine2: 'REWARDS',
    dividerLabel: 'Scan to sign up in seconds',
    bodyText: 'Enter your details and start earning perks today.',
    perks: [
      { icon: 'star', label: 'Earn points every visit' },
      { icon: 'gift', label: 'Unlock member-only offers' },
      { icon: 'bell', label: 'Get exclusive updates' },
    ],
    // Layout scaled ~1.35× from the original 4×6 so everything grows with the card.
    layout: {
      topMargin: 40,
      badgeSize: 32,
      wordmarkFontSize: 17.5,
      logoBoxMaxW: 230,
      gapAfterLogo: 24,
      headlineFontSize1: 24,
      headlineFontSize2: 38,
      gapHeadlineLines: 3,
      gapAfterHeadline: 24,
      dividerFontSize: 13,
      gapAfterDivider: 24,
      bodyFontSize: 12,
      gapAfterBody: 32,
      perkIconR: 17.5,
      perkLabelFontSize: 9.5,
      gapAfterPerks: 32,
      qrSize: 146,
      qrBoxPad: 11,
      gapAfterQr: 22,
      ctaW: 202,
      ctaH: 35,
      ctaFontSize: 13,
      gapAfterCta: 19,
      footerNoteFontSize: 10,
      footerFontSize: 10,
      cornerRadius: 19,
      strokeScale: 1.35,
    },
  },
  glass_print: {
    width: 576, // 8in
    height: 720, // 10in
    bg: '#ffffff',
    headlineColor: '#1a1b2e',
    bodyColor: '#6b7280',
    footerColor: '#6b7280',
    headlineLine1: 'SCAN TO JOIN',
    headlineLine2: 'REWARDS',
    dividerLabel: 'Quick sign-up. Exclusive perks.',
    bodyText: 'Scan the code, fill in your details, and start earning rewards today.',
    perks: [
      { icon: 'star', label: 'Earn Points' },
      { icon: 'gift', label: 'Member Offers' },
      { icon: 'bell', label: 'VIP Updates' },
    ],
    footerNote: 'Free to join  •  Takes less than a minute',
    layout: {
      topMargin: 46,
      badgeSize: 40,
      wordmarkFontSize: 22,
      logoBoxMaxW: 340,
      gapAfterLogo: 26,
      headlineFontSize1: 30,
      headlineFontSize2: 46,
      gapHeadlineLines: 4,
      gapAfterHeadline: 26,
      dividerFontSize: 16,
      gapAfterDivider: 26,
      bodyFontSize: 14,
      gapAfterBody: 36,
      perkIconR: 20,
      perkLabelFontSize: 12,
      gapAfterPerks: 38,
      qrSize: 170,
      qrBoxPad: 12,
      gapAfterQr: 24,
      ctaW: 250,
      ctaH: 40,
      ctaFontSize: 14.5,
      gapAfterCta: 16,
      footerNoteFontSize: 12.5,
      footerFontSize: 11,
      cornerRadius: 18,
      strokeScale: 1.6,
    },
  },
}

// Simple vector glyphs for the perk row (earn points / offers / updates) —
// these are generic UI bullet icons, not a reproduction of any supplied logo.
const ICON_PATH: Record<'star' | 'gift' | 'bell', string> = {
  star: 'M12 3.5l2.47 5.01 5.53.8-4 3.9.94 5.5L12 16.9l-4.94 2.6.94-5.5-4-3.9 5.53-.8z',
  gift: 'M5 9.5h14v3H5zM6 12.5h12v7.5H6zM12 9.5v10M9 9.5c0-2 1-3.5 3-3.5s3 1.5 3 3.5M9 9.5c0-2-1-3.5-3-2.5C4.5 7.8 5 9.5 6.5 9.5H9z',
  bell: 'M12 4.5c-2.5 0-4 2-4 4.5v3.2c0 .8-.3 1.6-.9 2.2l-.8.8h11.4l-.8-.8c-.6-.6-.9-1.4-.9-2.2V9c0-2.5-1.5-4.5-4-4.5z M10.2 17.5a1.8 1.8 0 0 0 3.6 0',
}

let cachedDefaultLogo: string | null = null

/** Reads the real RevOverflow icon file and returns it as a data URI. Never regenerated/redrawn. */
async function getDefaultLogoDataUri(): Promise<string> {
  if (cachedDefaultLogo) return cachedDefaultLogo
  const filePath = path.join(process.cwd(), 'public', 'ro-icon.png')
  const buf = await readFile(filePath)
  cachedDefaultLogo = `data:image/png;base64,${buf.toString('base64')}`
  return cachedDefaultLogo
}

/** Fetches the merchant's uploaded logo and returns it as a data URI, or null on any failure (caller falls back to default). */
async function fetchLogoDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/png'
    return `data:${contentType};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

export async function generateDecalSvg({ vipUrl, productType, logoUrl }: DesignParams): Promise<string> {
  const t = THEME[productType]
  const L = t.layout

  const qrSize = L.qrSize
  const qrBoxPad = L.qrBoxPad
  const qrBoxSize = qrSize + qrBoxPad * 2

  const qrDataUrl = await QRCode.toDataURL(vipUrl, {
    width: qrSize,
    margin: 0,
    color: { dark: '#1a1b2e', light: '#ffffff' },
  })

  // Header image: merchant's real uploaded logo if they have one, otherwise
  // the real RevOverflow icon file. Either way it's an embedded image, never
  // a redrawn approximation.
  const merchantLogoDataUri = logoUrl ? await fetchLogoDataUri(logoUrl) : null
  const usingMerchantLogo = !!merchantLogoDataUri
  const headerImageDataUri = merchantLogoDataUri ?? (await getDefaultLogoDataUri())

  const cx = t.width / 2
  let y = L.topMargin

  // ── Header (logo) ───────────────────────────────────────────────────────
  const badgeSize = L.badgeSize
  const logoY = y
  const wordmarkFontSize = L.wordmarkFontSize
  // Merchant logos get a wider, taller bounding box since there's no
  // wordmark beside them; the default RO icon keeps the original small
  // badge + wordmark footprint. Use the taller of the two for the gap below
  // so vertical rhythm stays consistent either way.
  const merchantLogoBoxH = badgeSize * 1.5
  const headerBlockH = usingMerchantLogo ? merchantLogoBoxH : badgeSize
  y += headerBlockH + L.gapAfterLogo

  // ── Headline ─────────────────────────────────────────────────────────
  const headlineFontSize1 = L.headlineFontSize1
  const headlineFontSize2 = L.headlineFontSize2
  const headlineY1 = y
  y += headlineFontSize2 + L.gapHeadlineLines
  const headlineY2 = y
  y += L.gapAfterHeadline

  // ── Divider ──────────────────────────────────────────────────────────
  const dividerY = y
  const dividerFontSize = L.dividerFontSize
  y += L.gapAfterDivider

  // ── Body copy ────────────────────────────────────────────────────────
  const bodyFontSize = L.bodyFontSize
  const bodyY = y
  y += L.gapAfterBody

  // ── Perk row ─────────────────────────────────────────────────────────
  const perkRowY = y
  const perkIconR = L.perkIconR
  const perkLabelFontSize = L.perkLabelFontSize
  y += perkIconR * 2 + L.gapAfterPerks

  // ── QR code ──────────────────────────────────────────────────────────
  const qrBoxY = y
  y += qrBoxSize + L.gapAfterQr

  // ── CTA button ───────────────────────────────────────────────────────
  const ctaW = L.ctaW
  const ctaH = L.ctaH
  const ctaY = y
  y += ctaH + L.gapAfterCta

  // ── Footer note (glass_print only) ──────────────────────────────────
  let footerNoteSvg = ''
  if (t.footerNote) {
    footerNoteSvg = `<text x="${cx}" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${L.footerNoteFontSize}" fill="${t.footerColor}">${t.footerNote}</text>`
  }

  const footerY = t.height - L.topMargin * 0.45

  // Estimate the divider label's rendered width (rough avg-char-width heuristic —
  // there's no real text-measurement available at SVG-generation time) so the
  // flanking lines sit clear of the text instead of crossing through it.
  const dividerTextHalfWidth = (t.dividerLabel.length * dividerFontSize * 0.56) / 2
  const lineOuterX = t.width * 0.30
  const lineInnerX = dividerTextHalfWidth + 6
  const dividerLineSvg =
    lineInnerX < lineOuterX
      ? `<line x1="${cx - lineOuterX}" y1="${dividerY - 3}" x2="${cx - lineInnerX}" y2="${dividerY - 3}" stroke="${VIOLET}" stroke-width="1" />
         <line x1="${cx + lineInnerX}" y1="${dividerY - 3}" x2="${cx + lineOuterX}" y2="${dividerY - 3}" stroke="${VIOLET}" stroke-width="1" />`
      : ''

  function perkIcon(kind: 'star' | 'gift' | 'bell', x: number, y0: number) {
    const s = (perkIconR * 1.1) / 24
    return `
      <circle cx="${x}" cy="${y0}" r="${perkIconR}" fill="none" stroke="${VIOLET}" stroke-width="${1.4 * L.strokeScale}" />
      <g transform="translate(${x - 12 * s}, ${y0 - 12 * s}) scale(${s})">
        <path d="${ICON_PATH[kind]}" fill="none" stroke="${VIOLET}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </g>`
  }

  const perkXs = [t.width * 0.22, t.width * 0.5, t.width * 0.78]
  const perksSvg = t.perks
    .map((p, i) => {
      const x = perkXs[i]
      const icon = perkIcon(p.icon, x, perkRowY)
      const divider =
        i < t.perks.length - 1
          ? `<line x1="${(perkXs[i] + perkXs[i + 1]) / 2}" y1="${perkRowY - perkIconR}" x2="${(perkXs[i] + perkXs[i + 1]) / 2}" y2="${perkRowY + perkIconR}" stroke="${t.bodyColor}" stroke-width="0.75" opacity="0.4" />`
          : ''
      // Wrap label across up to two lines if it has multiple words
      const words = p.label.split(' ')
      const mid = Math.ceil(words.length / 2)
      const line1 = words.slice(0, mid).join(' ')
      const line2 = words.slice(mid).join(' ')
      const labelSvg = line2
        ? `<text x="${x}" y="${perkRowY + perkIconR + 14}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="600" font-size="${perkLabelFontSize}" fill="${t.headlineColor}">${line1}</text>
           <text x="${x}" y="${perkRowY + perkIconR + 14 + perkLabelFontSize + 2}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="600" font-size="${perkLabelFontSize}" fill="${t.headlineColor}">${line2}</text>`
        : `<text x="${x}" y="${perkRowY + perkIconR + 14}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="600" font-size="${perkLabelFontSize}" fill="${t.headlineColor}">${line1}</text>`
      return `${icon}${divider}${labelSvg}`
    })
    .join('\n')

  // ── Header markup ────────────────────────────────────────────────────
  // Default (no merchant logo): real RO icon image in a small badge + the
  // "RevOverflow" wordmark text beside it (same footprint as the original
  // design). Merchant logo present: the merchant's real image, larger,
  // centered, with no wordmark — it's their card now.
  let headerSvg: string
  if (usingMerchantLogo) {
    const boxW = L.logoBoxMaxW
    const boxH = merchantLogoBoxH
    const boxX = cx - boxW / 2
    const pad = boxH * 0.12
    headerSvg = `
      <rect x="${boxX}" y="${logoY}" width="${boxW}" height="${boxH}" rx="${boxH * 0.16}" fill="#ffffff" />
      <image href="${headerImageDataUri}" x="${boxX + pad}" y="${logoY + pad}" width="${boxW - pad * 2}" height="${boxH - pad * 2}" preserveAspectRatio="xMidYMid meet" />`
  } else {
    headerSvg = `
      <rect x="${cx - t.width * 0.22}" y="${logoY}" width="${badgeSize}" height="${badgeSize}" rx="${badgeSize * 0.22}" fill="#f7f7fb" />
      <image href="${headerImageDataUri}" x="${cx - t.width * 0.22 + badgeSize * 0.08}" y="${logoY + badgeSize * 0.08}" width="${badgeSize * 0.84}" height="${badgeSize * 0.84}" preserveAspectRatio="xMidYMid meet" />
      <text x="${cx - t.width * 0.22 + badgeSize + 8}" y="${logoY + badgeSize * 0.68}" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="800" font-size="${wordmarkFontSize}" fill="${t.headlineColor}">Rev<tspan fill="${VIOLET}">Overflow</tspan></text>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}" height="${t.height}" viewBox="0 0 ${t.width} ${t.height}">
  <rect width="${t.width}" height="${t.height}" rx="${L.cornerRadius}" fill="${t.bg}" />

  <!-- Logo header -->
  ${headerSvg}

  <!-- Headline -->
  <text x="${cx}" y="${headlineY1}" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="800" font-size="${headlineFontSize1}" fill="${t.headlineColor}">${t.headlineLine1}</text>
  <text x="${cx}" y="${headlineY2}" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="800" font-size="${headlineFontSize2}" fill="${VIOLET}">${t.headlineLine2}</text>

  <!-- Divider -->
  ${dividerLineSvg}
  <text x="${cx}" y="${dividerY}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="600" font-size="${dividerFontSize}" fill="${t.headlineColor}">${t.dividerLabel}</text>

  <!-- Body -->
  <text x="${cx}" y="${bodyY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${bodyFontSize}" fill="${t.bodyColor}">${t.bodyText}</text>

  <!-- Perks -->
  ${perksSvg}

  <!-- QR -->
  <rect x="${cx - qrBoxSize / 2}" y="${qrBoxY}" width="${qrBoxSize}" height="${qrBoxSize}" rx="${8 * L.strokeScale}" fill="#ffffff" stroke="${VIOLET}" stroke-width="${1.5 * L.strokeScale}" />
  <image href="${qrDataUrl}" x="${cx - qrSize / 2}" y="${qrBoxY + qrBoxPad}" width="${qrSize}" height="${qrSize}" />

  <!-- CTA -->
  <rect x="${cx - ctaW / 2}" y="${ctaY}" width="${ctaW}" height="${ctaH}" rx="${ctaH / 2}" fill="${VIOLET}" />
  <text x="${cx}" y="${ctaY + ctaH / 2 + 4}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${L.ctaFontSize}" fill="#ffffff">SCAN HERE TO JOIN</text>

  ${footerNoteSvg}

  <!-- Footer -->
  <text x="${cx}" y="${footerY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${L.footerFontSize}" fill="${t.footerColor}">Powered by <tspan font-weight="700" fill="${t.headlineColor}">Rev</tspan><tspan font-weight="700" fill="${VIOLET}">Overflow</tspan></text>
</svg>`
}
