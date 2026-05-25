import type { ReactNode } from 'react'
import type { Profile } from '@/lib/auth/session'
import type { SidebarCounters } from '@/lib/analytics/sidebar-counters'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { BottomNavBar } from './BottomNavBar'

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
  return (
    <div className="dashboard-shell flex min-h-dvh bg-app-bg md:min-h-screen">
      <div className="hidden shrink-0 md:flex md:h-screen md:sticky md:top-0">
        <AppSidebar profile={profile} isAdmin={isAdmin} counters={counters} />
      </div>
      <div className="content-panel flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader userName={profile.full_name} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-4 sm:px-4 md:overflow-visible md:px-8 md:py-8">
          {children}
        </main>
        <BottomNavBar
          profile={profile}
          isAdmin={isAdmin}
          counters={counters}
        />
      </div>
    </div>
  )
}
