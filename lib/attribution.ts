/**
 * Control-Group Attribution
 *
 * Single source of truth for turning a campaign's `campaign_sends` rows
 * (sent group + held-out control group) into a revenue number that's
 * actually proven, not just "anyone who bought within 30 days."
 *
 * Methodology: a control group (typically ~15% of targeted customers) never
 * receives the campaign. Whatever fraction of the control group converts
 * anyway is the baseline — customers who would have bought regardless.
 * "Incremental" conversions are sent-group conversions above that baseline,
 * valued at the sent group's average order value.
 *
 * Used by:
 *  - app/api/campaigns/eligible/route.ts (per-campaign stats shown in the UI)
 *  - lib/guarantee.ts (the 3x ROI guarantee's revenue_recovered figure)
 *
 * Keeping this in one function means the number a merchant sees on the
 * Campaigns page and the number that triggers a refund are always computed
 * the same way.
 */

export interface CampaignSendRow {
  is_control_group: boolean
  converted_at: string | null
  conversion_value: string | number | null
}

export interface CampaignAttribution {
  sentCount: number
  controlCount: number
  sentConverted: number
  controlConverted: number
  sentRate: number        // % of sent group that converted, rounded
  controlRate: number      // % of control group that converted, rounded
  lift: number | null      // % lift of sent over control, rounded
  sentRevenue: number      // total revenue from converted sent-group customers, rounded
  attributedRevenue: number // control-group-adjusted incremental revenue, rounded
}

export function computeCampaignAttribution(sends: CampaignSendRow[] | null | undefined): CampaignAttribution | null {
  if (!sends || sends.length === 0) return null

  const sent    = sends.filter(s => !s.is_control_group)
  const control = sends.filter(s => s.is_control_group)

  const sentConverted    = sent.filter(s => s.converted_at)
  const controlConverted = control.filter(s => s.converted_at)

  const sentRevenue = sentConverted.reduce((sum, s) => sum + parseFloat(String(s.conversion_value ?? '0')), 0)

  const sentRate    = sent.length    > 0 ? sentConverted.length    / sent.length    : 0
  const controlRate = control.length > 0 ? controlConverted.length / control.length : 0
  const lift        = controlRate > 0 ? ((sentRate - controlRate) / controlRate) * 100 : null

  // Incremental revenue = conversions beyond what the control group's
  // baseline rate would predict, valued at the sent group's average order value.
  const expectedConversions = Math.round(sent.length * controlRate)
  const incrementalConversions = Math.max(0, sentConverted.length - expectedConversions)
  const avgOrderValue = sentConverted.length > 0 ? sentRevenue / sentConverted.length : 0
  const attributedRevenue = incrementalConversions * avgOrderValue

  return {
    sentCount: sent.length,
    controlCount: control.length,
    sentConverted: sentConverted.length,
    controlConverted: controlConverted.length,
    sentRate: Math.round(sentRate * 100),
    controlRate: Math.round(controlRate * 100),
    lift: lift !== null ? Math.round(lift) : null,
    sentRevenue: Math.round(sentRevenue),
    attributedRevenue: Math.round(attributedRevenue),
  }
}
