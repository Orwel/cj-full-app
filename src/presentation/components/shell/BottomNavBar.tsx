'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { SidebarCounters } from '@/lib/analytics/sidebar-counters'
import { LogoutButton } from '@/presentation/components/LogoutButton'
import { moreNavItems, primaryBottomNav, type NavItem } from './nav-config'
import { NavIcon } from './NavIcons'

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}

function BottomNavLink({
  item,
  pathname,
  counters,
  onNavigate,
}: {
  item: NavItem
  pathname: string
  counters: SidebarCounters
  onNavigate?: () => void
}) {
  const active = isActive(pathname, item.href, item.exact)
  const badge = item.badge?.(counters)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1 transition-colors ${
        active ? 'text-brand-700' : 'text-app-muted-text active:text-brand-600'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="relative">
        <NavIcon
          name={item.icon}
          className={`h-6 w-6 ${active ? 'stroke-[2.25]' : ''}`}
        />
        {badge != null && badge > 0 ? <NavBadge count={badge} /> : null}
      </span>
      <span className={`text-[10px] font-medium leading-tight ${active ? 'text-brand-700' : ''}`}>
        {item.label}
      </span>
    </Link>
  )
}

export function BottomNavBar({
  isAdmin,
  counters,
}: {
  isAdmin: boolean
  counters: SidebarCounters
}) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const secondary = moreNavItems.filter((item) => !item.adminOnly || isAdmin)
  const moreActive = secondary.some((item) => isActive(pathname, item.href, item.exact))

  return (
    <>
      <nav
        className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-app-border bg-app-surface/95 backdrop-blur-md md:hidden"
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
          {primaryBottomNav.map((item) => (
            <BottomNavLink
              key={item.href}
              item={item}
              pathname={pathname}
              counters={counters}
            />
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1 transition-colors ${
              moreActive ? 'text-brand-700' : 'text-app-muted-text'
            }`}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            aria-label="Más opciones"
          >
            <NavIcon name="menu" className="h-6 w-6" />
            <span className="text-[10px] font-medium leading-tight">Más</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[min(85vh,32rem)] overflow-y-auto rounded-t-2xl border-t border-app-border bg-app-surface shadow-2xl">
            <div className="mx-auto w-10 pt-3">
              <span className="block h-1 rounded-full bg-app-border" />
            </div>
            <p className="px-5 pt-4 text-xs font-bold uppercase tracking-widest text-app-muted-text">
              Más opciones
            </p>
            <ul className="space-y-0.5 px-3 py-3">
              {secondary.map((item) => {
                const active = isActive(pathname, item.href, item.exact)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-brand-50 text-brand-700'
                          : 'text-app-text hover:bg-app-muted'
                      }`}
                    >
                      <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className="border-t border-app-border px-5 py-4">
              <LogoutButton variant="default" />
            </div>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </div>
      )}
    </>
  )
}
