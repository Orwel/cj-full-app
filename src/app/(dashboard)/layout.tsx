import { redirect } from 'next/navigation'
import { getMyProfile, getSessionUser } from '@/lib/auth/session'
import { getSidebarCounters } from '@/lib/analytics/sidebar-counters'
import { DashboardShell } from '@/presentation/components/shell/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const profile = await getMyProfile()
  if (!profile) {
    redirect('/login')
  }

  const isAdmin = profile.role === 'admin'
  const counters = await getSidebarCounters()

  return (
    <DashboardShell profile={profile} isAdmin={isAdmin} counters={counters}>
      {children}
    </DashboardShell>
  )
}
