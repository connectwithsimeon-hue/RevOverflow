import { redirect } from 'next/navigation'

// Loyalty (punch-card) was removed in favour of the Flash Offer engine.
// Any old link here just sends the merchant back to the dashboard.
export default function LoyaltyRemoved() {
  redirect('/dashboard')
}
