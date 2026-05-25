import type { SidebarCounters } from '@/lib/analytics/sidebar-counters'

export type NavIconName =
  | 'home'
  | 'folder'
  | 'bell'
  | 'chart'
  | 'user'
  | 'users'
  | 'settings'
  | 'menu'
  | 'plus'

export type NavItem = {
  href: string
  label: string
  icon: NavIconName
  exact?: boolean
  adminOnly?: boolean
  badge?: (counters: SidebarCounters) => number | undefined
}

/** Pestañas visibles en la barra inferior (móvil). */
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

/** Enlaces del menú lateral (hamburguesa) — equivalente al sidebar en desktop. */
export const mobileMenuSections: {
  title: string
  items: NavItem[]
}[] = [
  {
    title: 'General',
    items: [
      { href: '/dashboard/perfil', label: 'Perfil', icon: 'user' },
      { href: '/dashboard/casos/new', label: 'Nuevo caso', icon: 'plus' },
    ],
  },
  {
    title: 'Análisis',
    items: [{ href: '/dashboard/estadisticas', label: 'Estadísticas', icon: 'chart' }],
  },
  {
    title: 'Administración',
    items: [
      {
        href: '/dashboard/admin/estudiantes',
        label: 'Estudiantes',
        icon: 'users',
        adminOnly: true,
      },
      {
        href: '/dashboard/admin/operaciones',
        label: 'Operaciones',
        icon: 'settings',
        adminOnly: true,
      },
    ],
  },
]
