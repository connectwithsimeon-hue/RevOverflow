/**
 * Ensures a merchant has a vip_slug, generating + persisting one if missing.
 * Shared by the VIP QR endpoint and the decal-order endpoint (decals embed
 * the same VIP signup QR code).
 */
import { SupabaseClient } from '@supabase/supabase-js'

export async function ensureVipSlug(
  service: SupabaseClient,
  merchant: { id: string; vip_slug?: string | null; business_name: string }
): Promise<string> {
  if (merchant.vip_slug) return merchant.vip_slug

  let slug = merchant.business_name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30)
  slug = `${slug}-${merchant.id.slice(0, 6)}`

  await service.from('merchants').update({ vip_slug: slug }).eq('id', merchant.id)
  return slug
}
