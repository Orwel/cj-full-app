'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/lib/auth/session'
import type { SidebarCounters } from '@/lib/analytics/sidebar-counters'
import { LogoutButton } from '@/presentation/components/LogoutButton'
import { mobileMenuSections, primaryBottomNav, type NavItem } from './nav-config'
import { NavIcon } from './NavIcons'

const SIDEBAR_LOGO = '/Logo-Los-Libertadores.png'

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
      className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors ${
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
  profile,
  isAdmin,
  counters,
}: {
  profile: Profile
  isAdmin: boolean
  counters: SidebarCounters
}) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const menuSections = mobileMenuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((section) => section.items.length > 0)

  const menuActive = menuSections.some((section) =>
    section.items.some((item) => isActive(pathname, item.href, item.exact)),
  )

  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  return (
    <>
      <nav
        className="bottom-nav-bar z-30 shrink-0 border-t border-app-border bg-app-surface shadow-[0_-4px_24px_rgba(15,23,42,0.08)] md:hidden"
        aria-label="Navegación principal"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
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
            onClick={() => setMenuOpen(true)}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 transition-colors ${
              menuActive ? 'text-brand-700' : 'text-app-muted-text'
            }`}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            aria-label="Abrir menú de navegación"
          >
            <NavIcon name="menu" className="h-6 w-6" />
            <span className="text-[10px] font-medium leading-tight">Menú</span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal aria-label="Menú">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,18.5rem)] flex-col bg-sidebar shadow-2xl">
            <div className="border-b border-sidebar-border px-5 py-4">
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block">
                <Image
                  src={SIDEBAR_LOGO}
                  alt="Los Libertadores"
                  width={200}
                  height={48}
                  className="h-9 w-auto max-w-full object-contain object-left"
                />
              </Link>
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-sidebar-text">
                Consultorio jurídico
              </p>
            </div>

            <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
              {menuSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {section.title}
                  </p>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => {
                      const active = isActive(pathname, item.href, item.exact)
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                              active
                                ? 'bg-brand-700 text-white'
                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                            }`}
                          >
                            <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                            {item.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div className="space-y-3 border-t border-sidebar-border p-4">
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
              </div>
              <LogoutButton variant="sidebar" />
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
