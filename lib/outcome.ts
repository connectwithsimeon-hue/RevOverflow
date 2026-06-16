/**
 * Learning Loop — Outcome Logger
 *
 * Every action Yara takes gets logged to outcome_log from Day 1.
 * This is the single source of truth for:
 *   - What was sent (action_type, channel, trigger_type)
 *   - What came back (revenue_attributed when customer buys post-campaign)
 *   - Pattern recognition (L2 reads this table to find what works per industry)
 *
 * outcome_log schema:
 *   id, merchant_id, customer_id, action_type, channel, trigger_type,
 *   revenue_amount (numeric), metadata (jsonb), created_at
 */

import { createServiceClient } from '@/lib/supabase/server'

export type ActionType =
  | 'campaign_sent'       // Yara sent a message
  | 'revenue_attributed'  // Customer made a purchase within 30 days of a send
  | 'vip_signup'          // Customer joined via VIP QR page
  | 'referral_join'       // Customer joined via referral link
  | 'referral_sent'       // Existing customer referred someone
  | 'sms_opt_in'          // Customer confirmed SMS double opt-in
  | 'sms_opt_out'         // Customer replied STOP
  | 'offer_created'       // Square offer/discount created
  | 'guarantee_review'    // Day-60 guarantee check flagged
  | 'cron_run'            // Cron job completed
  | 'ad_audience_synced'  // Facebook/Google ad suppression + lookalike audiences refreshed

export type Channel = 'email' | 'sms' | 'whatsapp' | 'referral' | 'system'

export type TriggerType = 'win_back' | 'new_customer' | 'vip_reward' | 'birthday' | 'cross_sell'

interface LogActionParams {
  merchantId: string
  customerId?: string
  actionType: ActionType
  channel: Channel
  triggerType?: TriggerType
  revenueAmount?: number
  metadata?: Record<string, unknown>
}

/**
 * Log a single Yara action to outcome_log.
 * Fire-and-forget safe — errors are caught and logged to console only.
 */
export async function logOutcome(params: LogActionParams): Promise<void> {
  try {
    const service = createServiceClient()
    await service.from('outcome_log').insert({
      merchant_id:    params.merchantId,
      customer_id:    params.customerId || null,
      action_type:    params.actionType,
      channel:        params.channel,
      trigger_type:   params.triggerType || null,
      revenue_amount: params.revenueAmount ?? null,
      metadata:       params.metadata || null,
    })
  } catch (err) {
    console.error('[outcome] Failed to log outcome:', err)
  }
}

/**
 * After a Square webhook fires for a new order, check if the customer
 * received a campaign within the last 30 days. If so, log revenue_attributed.
 *
 * Called from the Square webhook handler.
 */
export async function attributeRevenueIfCampaignSent(params: {
  merchantId: string
  customerId: string
  orderAmount: number
  orderedAt: string
}): Promise<void> {
  try {
    const service = createServiceClient()

    // Was a message sent to this customer in the last 30 days?
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: recentSend } = await service
      .from('outcome_log')
      .select('id, trigger_type, channel')
      .eq('merchant_id', params.merchantId)
      .eq('customer_id', params.customerId)
      .eq('action_type', 'campaign_sent')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!recentSend) return   // No recent campaign — nothing to attribute

    // Check we haven't already attributed this order
    const { data: existing } = await service
      .from('outcome_log')
      .select('id')
      .eq('merchant_id', params.merchantId)
      .eq('customer_id', params.customerId)
      .eq('action_type', 'revenue_attributed')
      .gte('created_at', params.orderedAt)
      .limit(1)
      .single()

    if (existing) return  // Already attributed

    await logOutcome({
      merchantId:    params.merchantId,
      customerId:    params.customerId,
      actionType:    'revenue_attributed',
      channel:       recentSend.channel as Channel,
      triggerType:   recentSend.trigger_type as TriggerType | undefined,
      revenueAmount: params.orderAmount,
      metadata: {
        order_amount:    params.orderAmount,
        attributed_send: recentSend.id,
        ordered_at:      params.orderedAt,
      },
    })
  } catch (err) {
    console.error('[outcome] attributeRevenue error:', err)
  }
}

/**
 * Convenience: log a campaign_sent event.
 * Called from send-sms and send (email) routes.
 */
export async function logCampaignSent(params: {
  merchantId: string
  customerId: string
  channel: Channel
  triggerType?: TriggerType
  campaignId?: string
}): Promise<void> {
  await logOutcome({
    merchantId:  params.merchantId,
    customerId:  params.customerId,
    actionType:  'campaign_sent',
    channel:     params.channel,
    triggerType: params.triggerType,
    metadata:    { campaign_id: params.campaignId },
  })
}
