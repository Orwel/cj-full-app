import type { ReactNode } from 'react'
import type { Profile } from '@/lib/auth/session'
import type { SidebarCounters } from '@/lib/analytics/sidebar-counters'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { MobileNavToggle } from './MobileNavToggle'

export function DashboardShell({
  profile,
  isAdmin,
  counters,
  children,
}: {
  profile: Profile
  isAdmin: boolean
  counters: SidebarCounters
  children: ReactNode
}) {
  const sidebar = (
    <AppSidebar profile={profile} isAdmin={isAdmin} counters={counters} />
  )

  return (
    <div className="flex min-h-screen bg-app-bg">
      <div className="sticky top-0 hidden h-screen md:flex">{sidebar}</div>
      <div className="content-panel flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-app-border bg-app-surface px-4 py-2.5 md:hidden">
          <MobileNavToggle sidebar={sidebar} />
          <span className="text-sm font-semibold text-app-text">Consultorio</span>
        </div>
        <AppHeader userName={profile.full_name} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  )
}
