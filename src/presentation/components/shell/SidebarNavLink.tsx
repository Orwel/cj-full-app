'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function SidebarNavLink({
  href,
  children,
  badge,
  exact = false,
}: {
  href: string
  children: ReactNode
  badge?: number
  exact?: boolean
}) {
  const pathname = usePathname()
  const active = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-brand-700 text-white'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
      }`}
    >
      <span className="flex-1">{children}</span>
      {badge != null && badge > 0 ? (
        <span className="min-w-[1.25rem] rounded-full bg-zinc-700 px-1.5 py-0.5 text-center text-[10px] font-semibold text-zinc-200">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}
