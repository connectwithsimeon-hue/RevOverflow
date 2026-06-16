/**
 * Ad Audience Sync — orchestrator
 *
 * Refreshes a merchant's Facebook suppression + lookalike audiences and
 * Google Ads suppression (Customer Match) list from their current
 * customer base. Safe to call repeatedly — audience IDs are created once
 * and cached on the merchants table, then just re-uploaded with the
 * latest customer list on every call.
 *
 * Called from:
 *   - app/api/integrations/ads/sync/route.ts  (manual "Sync now" button)
 *   - app/api/cron/ad-sync/route.ts           (weekly automated refresh)
 */
import { createServiceClient } from '@/lib/supabase/server'
import { createSuppressionAudience, addCustomersToAudience, createLookalikeAudience } from '@/lib/meta-ads'
import { createCustomerMatchUserList, uploadCustomersToUserList } from '@/lib/google-customer-match'
import { logOutcome } from '@/lib/outcome'

export interface AdSyncResult {
  meta?: { suppressionSynced: number; lookalikeCreated: boolean; error?: string }
  google?: { suppressionSynced: number; error?: string }
  skipped?: string
}

export async function syncMerchantAdAudiences(merchantId: string): Promise<AdSyncResult> {
  const service = createServiceClient()

  const { data: merchant } = await service
    .from('merchants')
    .select(`
      id, business_name,
      meta_ad_account_id, meta_custom_audience_id, meta_lookalike_audience_id,
      google_ads_customer_id, google_ads_user_list_resource
    `)
    .eq('id', merchantId)
    .single()

  if (!merchant) return { skipped: 'merchant_not_found' }
  if (!merchant.meta_ad_account_id && !merchant.google_ads_customer_id) {
    return { skipped: 'no_ad_accounts_connected' }
  }

  const { data: customers } = await service
    .from('customers')
    .select('email, phone')
    .eq('merchant_id', merchantId)
    .or('email.not.is.null,phone.not.is.null')

  const allCustomers = (customers ?? []).map(c => ({ email: c.email ?? undefined, phone: c.phone ?? undefined }))
  const result: AdSyncResult = {}

  // ── Meta / Facebook ──────────────────────────────────────────────────────
  if (merchant.meta_ad_account_id) {
    try {
      let audienceId: string | null = merchant.meta_custom_audience_id ?? null
      let lookalikeId: string | null = merchant.meta_lookalike_audience_id ?? null
      let metaError: string | undefined

      if (!audienceId) {
        const created = await createSuppressionAudience({
          adAccountId: merchant.meta_ad_account_id,
          name: `${merchant.business_name} — RevOverflow Customers (Suppression)`,
          description: 'Auto-synced existing customers — exclude from new-customer acquisition campaigns',
        })
        if (created.ok && created.audienceId) {
          audienceId = created.audienceId
          await service.from('merchants').update({ meta_custom_audience_id: audienceId }).eq('id', merchantId)
        } else {
          metaError = created.error
        }
      }

      let synced = 0
      if (audienceId) {
        const upload = await addCustomersToAudience({ audienceId, customers: allCustomers })
        if (upload.ok) synced = allCustomers.length
        else metaError = upload.error

        if (upload.ok && !lookalikeId) {
          const lookalike = await createLookalikeAudience({
            adAccountId: merchant.meta_ad_account_id,
            originAudienceId: audienceId,
            name: `${merchant.business_name} — RevOverflow Lookalike 1%`,
          })
          if (lookalike.ok && lookalike.audienceId) {
            lookalikeId = lookalike.audienceId
            await service.from('merchants').update({ meta_lookalike_audience_id: lookalikeId }).eq('id', merchantId)
          }
        }
      }

      result.meta = { suppressionSynced: synced, lookalikeCreated: !!lookalikeId, error: metaError }
    } catch (err: any) {
      result.meta = { suppressionSynced: 0, lookalikeCreated: false, error: err?.message }
    }
  }

  // ── Google Ads ───────────────────────────────────────────────────────────
  if (merchant.google_ads_customer_id) {
    try {
      let listResource: string | null = merchant.google_ads_user_list_resource ?? null
      let googleError: string | undefined

      if (!listResource) {
        const created = await createCustomerMatchUserList({
          customerId: merchant.google_ads_customer_id,
          name: `${merchant.business_name} — RevOverflow Customers (Suppression)`,
          description: 'Auto-synced existing customers — exclude from acquisition campaigns',
        })
        if (created.ok && created.userListResourceName) {
          listResource = created.userListResourceName
          await service.from('merchants').update({ google_ads_user_list_resource: listResource }).eq('id', merchantId)
        } else {
          googleError = created.error
        }
      }

      let synced = 0
      if (listResource) {
        const upload = await uploadCustomersToUserList({
          customerId: merchant.google_ads_customer_id,
          userListResourceName: listResource,
          customers: allCustomers,
        })
        if (upload.ok) synced = allCustomers.length
        else googleError = upload.error
      }

      result.google = { suppressionSynced: synced, error: googleError }
    } catch (err: any) {
      result.google = { suppressionSynced: 0, error: err?.message }
    }
  }

  await service.from('merchants').update({ last_ad_sync_at: new Date().toISOString() }).eq('id', merchantId)

  logOutcome({
    merchantId,
    actionType: 'ad_audience_synced',
    channel: 'system',
    metadata: { meta: result.meta, google: result.google },
  }).catch(() => {})

  return result
}
