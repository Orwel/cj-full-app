'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Panel',
  casos: 'Casos',
  alertas: 'Alertas',
  estadisticas: 'Estadísticas',
  admin: 'Admin',
  operaciones: 'Operaciones',
  new: 'Nuevo',
  editar: 'Editar',
}

function titleFromSegment(seg: string): string {
  if (SEGMENT_LABELS[seg]) return SEGMENT_LABELS[seg]
  if (/^[0-9a-f-]{36}$/i.test(seg)) return 'Detalle'
  return seg
}

export function AppHeader({ userName }: { userName: string }) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    return { label: titleFromSegment(seg), href }
  })

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 border-b border-app-border bg-app-surface px-4 md:px-8">
      <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm text-app-secondary">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex items-center gap-1">
            {i > 0 && <span className="text-app-muted-text">/</span>}
            {i < crumbs.length - 1 ? (
              <Link href={c.href} className="hover:text-brand-700">
                {c.label}
              </Link>
            ) : (
              <span className="truncate font-semibold text-app-text">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <span className="hidden max-w-[12rem] truncate text-sm text-app-secondary sm:inline">
        {userName}
      </span>
    </header>
  )
}
