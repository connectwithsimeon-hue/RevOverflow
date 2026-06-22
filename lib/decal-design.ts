/**
 * Counter Card / Window Sticker Design Generator
 *
 * Builds a print-ready SVG combining the merchant's existing VIP QR code
 * (same code already used on the dashboard / printed materials, S-25) with
 * their business name and a short call to action. Gelato accepts SVG as a
 * print file directly, so there's no need for a canvas/image-compositing
 * library — this is just a template string with an embedded QR data URI.
 *
 * Two physical products (per Simeon, 2026-06-22):
 *  - table_decal: a flat paper card that just sits at the counter — NOT
 *    adhesive. Sized like a postcard/note card (4in x 6in portrait) so it
 *    can rest flat or slot into a small acrylic stand. Maps to a Gelato
 *    "Postcard" / card-stock product.
 *  - glass_print: an adhesive sticker/cling for storefront glass or doors
 *    (8in x 8in square). Maps to a Gelato "Sticker" product.
 */

import QRCode from 'qrcode'

export type DecalProductType = 'table_decal' | 'glass_print'

interface DesignParams {
  businessName: string
  vipUrl: string
  productType: DecalProductType
}

// Inches → SVG user units at 72pt/inch (standard print convention)
const LAYOUT: Record<DecalProductType, { width: number; height: number; qrSize: number; fontSize: number; subFontSize: number }> = {
  table_decal: { width: 288, height: 432, qrSize: 160, fontSize: 18, subFontSize: 12 }, // 4in x 6in card
  glass_print: { width: 576, height: 576, qrSize: 340, fontSize: 32, subFontSize: 20 }, // 8in x 8in sticker
}

export async function generateDecalSvg({ businessName, vipUrl, productType }: DesignParams): Promise<string> {
  const layout = LAYOUT[productType]
  const qrDataUrl = await QRCode.toDataURL(vipUrl, {
    width: layout.qrSize,
    margin: 1,
    color: { dark: '#1a1b2e', light: '#ffffff' },
  })

  const qrX = (layout.width - layout.qrSize) / 2
  const qrY = layout.height * 0.22
  const nameY = qrY + layout.qrSize + layout.fontSize + 24
  const subY = nameY + layout.subFontSize + 10

  // Escape basic XML-unsafe characters in the business name
  const safeName = businessName
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}">
  <rect width="${layout.width}" height="${layout.height}" fill="#ffffff" />
  <rect x="6" y="6" width="${layout.width - 12}" height="${layout.height - 12}" rx="16" fill="none" stroke="#7C5CFC" stroke-width="3" />
  <text x="${layout.width / 2}" y="${qrY - 14}" text-anchor="middle" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-weight="800" font-size="${layout.fontSize}" fill="#1a1b2e">${safeName}</text>
  <image href="${qrDataUrl}" x="${qrX}" y="${qrY}" width="${layout.qrSize}" height="${layout.qrSize}" />
  <text x="${layout.width / 2}" y="${nameY}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="${layout.subFontSize + 4}" fill="#1a1b2e">Scan to join VIP rewards</text>
  <text x="${layout.width / 2}" y="${subY}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${layout.subFontSize}" fill="#6b7280">Exclusive perks for our regulars</text>
</svg>`
}
