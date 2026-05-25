'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type AlertasFilterState = {
  pendientes?: boolean
  severidad?: string
  orden?: string
}

function buildHref(
  pathname: string,
  current: AlertasFilterState,
  patch: Partial<AlertasFilterState>,
): string {
  const next: Record<string, string> = {}
  const merged = { ...current, ...patch }
  if (merged.pendientes) next.pendientes = '1'
  if (merged.severidad && merged.severidad !== 'todas') next.severidad = merged.severidad
  if (merged.orden && merged.orden !== 'reciente') next.orden = merged.orden
  const q = new URLSearchParams(next).toString()
  return q ? `${pathname}?${q}` : pathname
}

function chipClass(active: boolean): string {
  return active
    ? 'bg-brand-700 text-white'
    : 'bg-slate-100 text-app-secondary ring-1 ring-app-border hover:bg-slate-200'
}

function FilterRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="text-sm">
      <span className="mb-2 block font-medium text-app-secondary sm:mb-0 sm:inline sm:mr-2">
        {label}
      </span>
      <div className="-mx-1 flex gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:inline-flex sm:flex-wrap sm:overflow-visible sm:pb-0">
        {children}
      </div>
    </div>
  )
}

export function AlertasFilters({ filters }: { filters: AlertasFilterState }) {
  const pathname = usePathname()
  const sev = filters.severidad ?? 'todas'
  const orden = filters.orden ?? 'reciente'
  const soloPendientes = Boolean(filters.pendientes)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-app-border bg-app-surface p-3 shadow-sm sm:gap-4 sm:p-4">
      <FilterRow label="Estado:">
        <Link
          href={buildHref(pathname, filters, { pendientes: false })}
          className={`shrink-0 rounded-full px-3 py-1.5 ${chipClass(!soloPendientes)}`}
        >
          Todas
        </Link>
        <Link
          href={buildHref(pathname, filters, { pendientes: true })}
          className={`shrink-0 rounded-full px-3 py-1.5 ${chipClass(soloPendientes)}`}
        >
          Solo pendientes
        </Link>
      </FilterRow>
      <FilterRow label="Severidad:">
        {(['todas', 'critica', 'urgente', 'atencion', 'informativa'] as const).map((s) => (
          <Link
            key={s}
            href={buildHref(pathname, filters, { severidad: s })}
            className={`shrink-0 rounded-full px-3 py-1.5 capitalize ${chipClass(sev === s)}`}
          >
            {s === 'todas' ? 'Todas' : s === 'informativa' ? 'Novedad' : s}
          </Link>
        ))}
      </FilterRow>
      <FilterRow label="Orden:">
        <Link
          href={buildHref(pathname, filters, { orden: 'reciente' })}
          className={`shrink-0 rounded-full px-3 py-1.5 ${chipClass(orden === 'reciente')}`}
        >
          Más recientes
        </Link>
        <Link
          href={buildHref(pathname, filters, { orden: 'termino' })}
          className={`shrink-0 rounded-full px-3 py-1.5 whitespace-nowrap ${chipClass(orden === 'termino')}`}
        >
          Fin de término (próximo)
        </Link>
      </FilterRow>
    </div>
  )
}
