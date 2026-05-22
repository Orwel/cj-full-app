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
    <div className="flex min-h-screen bg-app-bg">
      <div className="sticky top-0 hidden h-screen md:flex">
        <AppSidebar profile={profile} isAdmin={isAdmin} counters={counters} />
      </div>
      <div className="content-panel flex min-h-screen min-w-0 flex-1 flex-col">
        <AppHeader userName={profile.full_name} />
        <main className="main-with-bottom-nav flex-1 px-3 py-4 sm:px-4 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
        <BottomNavBar isAdmin={isAdmin} counters={counters} />
      </div>
    </div>
  )
}
