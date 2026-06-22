/**
 * Gelato Print-on-Demand Client
 *
 * Used to fulfill the free in-store print feature: a merchant requests a
 * print, we generate a design (lib/decal-design.ts) combining their VIP QR
 * code + business name, host it at a public URL, and submit a real print +
 * ship order to Gelato.
 *
 * Two physical products (per Simeon, 2026-06-22):
 *   - table_decal: a flat paper card (postcard/note-card stock, ~4in x 6in)
 *     that just sits at the counter — NOT adhesive. Search Gelato's catalog
 *     for "Postcard" or "Greeting Card" / card-stock products.
 *   - glass_print: an adhesive sticker for storefront glass/doors (~8in x
 *     8in). Search Gelato's catalog for "Sticker".
 *
 * Setup required before this goes live (Simeon must do this himself —
 * never paste API keys into chat or have an assistant create accounts):
 *   1. Create a Gelato account at https://www.gelato.com and open the
 *      Gelato API dashboard to generate an API key.
 *   2. In the Gelato dashboard, browse the product catalog (Products →
 *      Catalog) and find the exact productUid for a postcard/card-stock
 *      product (table_decal) and a sticker product (glass_print). Product
 *      UIDs are account-catalog-specific strings like
 *      "stickers_pf_4x4-in_pt_matte-vinyl_cl_4-0" or
 *      "cards_pf_a6-pt_350-gsm-coated-silk_cl_4-4_ver" — copy the real ones
 *      from the dashboard rather than guessing, since an incorrect UID will
 *      reject the order at submit time.
 *   3. Add to .env.local / Vercel env vars:
 *        GELATO_API_KEY=...
 *        GELATO_TABLE_DECAL_PRODUCT_UID=...   (postcard / card-stock product)
 *        GELATO_GLASS_PRINT_PRODUCT_UID=...   (sticker product)
 */

import { DecalProductType } from './decal-design'

const GELATO_ORDER_URL = 'https://order.gelatoapis.com/v4/orders'

function productUidFor(productType: DecalProductType): string | null {
  if (productType === 'table_decal') return process.env.GELATO_TABLE_DECAL_PRODUCT_UID || null
  return process.env.GELATO_GLASS_PRINT_PRODUCT_UID || null
}

export interface GelatoShippingAddress {
  firstName: string
  lastName: string
  companyName?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state?: string
  postCode: string
  country: string  // ISO 3166-1 alpha-2, e.g. "US"
  email: string
  phone?: string
}

export interface CreateGelatoOrderParams {
  orderReferenceId: string   // our decal_orders.id
  customerReferenceId: string // our merchant.id
  productType: DecalProductType
  designUrl: string          // public URL to the SVG/PNG design file
  shippingAddress: GelatoShippingAddress
}

export interface GelatoOrderResult {
  ok: boolean
  gelatoOrderId?: string
  error?: string
}

export function isGelatoConfigured(productType: DecalProductType): boolean {
  return !!process.env.GELATO_API_KEY && !!productUidFor(productType)
}

export async function createGelatoOrder(params: CreateGelatoOrderParams): Promise<GelatoOrderResult> {
  const apiKey = process.env.GELATO_API_KEY
  const productUid = productUidFor(params.productType)

  if (!apiKey || !productUid) {
    return {
      ok: false,
      error: `Gelato is not configured for ${params.productType} yet. Set GELATO_API_KEY and ${params.productType === 'table_decal' ? 'GELATO_TABLE_DECAL_PRODUCT_UID' : 'GELATO_GLASS_PRINT_PRODUCT_UID'} in environment variables.`,
    }
  }

  try {
    const res = await fetch(GELATO_ORDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        orderType: 'order',
        orderReferenceId: params.orderReferenceId,
        customerReferenceId: params.customerReferenceId,
        currency: 'USD',
        items: [
          {
            itemReferenceId: `${params.orderReferenceId}-item`,
            productUid,
            files: [{ type: 'default', url: params.designUrl }],
            quantity: 1,
          },
        ],
        shipmentMethodUid: 'normal',
        shippingAddress: {
          firstName: params.shippingAddress.firstName,
          lastName: params.shippingAddress.lastName,
          companyName: params.shippingAddress.companyName,
          addressLine1: params.shippingAddress.addressLine1,
          addressLine2: params.shippingAddress.addressLine2,
          city: params.shippingAddress.city,
          state: params.shippingAddress.state,
          postCode: params.shippingAddress.postCode,
          country: params.shippingAddress.country,
          email: params.shippingAddress.email,
          phone: params.shippingAddress.phone,
        },
      }),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return { ok: false, error: data?.message || data?.code || `Gelato order failed (${res.status})` }
    }

    return { ok: true, gelatoOrderId: data?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown Gelato error' }
  }
}
