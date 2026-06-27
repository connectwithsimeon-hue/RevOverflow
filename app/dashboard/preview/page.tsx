import { redirect } from 'next/navigation'

// The redesigned dashboard is now the real one at /dashboard.
export default function DashboardPreview() {
  redirect('/dashboard')
}
