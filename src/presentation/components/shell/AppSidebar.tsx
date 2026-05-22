import Image from 'next/image'
import Link from 'next/link'
import type { Profile } from '@/lib/auth/session'
import type { SidebarCounters } from '@/lib/analytics/sidebar-counters'
import { LogoutButton } from '@/presentation/components/LogoutButton'
import { SidebarNavLink } from './SidebarNavLink'
import { SystemStatusWidget } from './SystemStatusWidget'

const SIDEBAR_LOGO = '/Logo-Los-Libertadores.png'

export function AppSidebar({
  profile,
  isAdmin,
  counters,
}: {
  profile: Profile
  isAdmin: boolean
  counters: SidebarCounters
}) {
  return (
    <aside className="sidebar-panel flex h-full w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Link href="/dashboard" className="block">
          <Image
            src={SIDEBAR_LOGO}
            alt="Los Libertadores"
            width={220}
            height={52}
            className="h-11 w-auto max-w-full object-contain object-left"
            priority
          />
        </Link>
        <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-sidebar-text">
          Consultorio jurídico
        </p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            General
          </p>
          <ul className="space-y-0.5">
            <li>
              <SidebarNavLink href="/dashboard" exact>
                Panel
              </SidebarNavLink>
            </li>
            <li>
              <SidebarNavLink href="/dashboard/casos" badge={counters.casosCount}>
                Casos
              </SidebarNavLink>
            </li>
            <li>
              <SidebarNavLink
                href="/dashboard/alertas"
                badge={counters.alertasPendientes}
              >
                Alertas
              </SidebarNavLink>
            </li>
            <li>
              <SidebarNavLink href="/dashboard/perfil">Perfil</SidebarNavLink>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Análisis
          </p>
          <ul className="space-y-0.5">
            <li>
              <SidebarNavLink href="/dashboard/estadisticas">
                Estadísticas
              </SidebarNavLink>
            </li>
          </ul>
        </div>

        {isAdmin && (
          <div>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Administración
            </p>
            <ul className="space-y-0.5">
              <li>
                <SidebarNavLink href="/dashboard/admin/operaciones">
                  Operaciones
                </SidebarNavLink>
              </li>
            </ul>
          </div>
        )}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border p-4">
        <SystemStatusWidget isAdmin={isAdmin} />
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-elevated px-3 py-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-100">
              {profile.full_name}
            </p>
            <p className="text-xs text-sidebar-text">
              {isAdmin ? 'Administrador' : 'Estudiante'}
            </p>
          </div>
          <LogoutButton variant="sidebar" />
        </div>
      </div>
    </aside>
  )
}
