import type { SidebarCounters } from '@/lib/analytics/sidebar-counters'

export type NavIconName =
  | 'home'
  | 'folder'
  | 'bell'
  | 'chart'
  | 'user'
  | 'settings'
  | 'menu'

export type NavItem = {
  href: string
  label: string
  icon: NavIconName
  exact?: boolean
  adminOnly?: boolean
  badge?: (counters: SidebarCounters) => number | undefined
}

export const primaryBottomNav: NavItem[] = [
  { href: '/dashboard', label: 'Panel', icon: 'home', exact: true },
  {
    href: '/dashboard/casos',
    label: 'Casos',
    icon: 'folder',
    badge: (c) => c.casosCount,
  },
  {
    href: '/dashboard/alertas',
    label: 'Alertas',
    icon: 'bell',
    badge: (c) => c.alertasPendientes,
  },
]

export const moreNavItems: NavItem[] = [
  { href: '/dashboard/perfil', label: 'Perfil', icon: 'user' },
  { href: '/dashboard/estadisticas', label: 'Estadísticas', icon: 'chart' },
  {
    href: '/dashboard/admin/operaciones',
    label: 'Operaciones',
    icon: 'settings',
    adminOnly: true,
  },
]
