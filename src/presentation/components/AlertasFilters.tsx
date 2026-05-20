'use client'

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

export function AlertasFilters({ filters }: { filters: AlertasFilterState }) {
  const pathname = usePathname()
  const sev = filters.severidad ?? 'todas'
  const orden = filters.orden ?? 'reciente'
  const soloPendientes = Boolean(filters.pendientes)

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-app-secondary">Estado:</span>
        <Link
          href={buildHref(pathname, filters, { pendientes: false })}
          className={`rounded-full px-3 py-1 ${chipClass(!soloPendientes)}`}
        >
          Todas
        </Link>
        <Link
          href={buildHref(pathname, filters, { pendientes: true })}
          className={`rounded-full px-3 py-1 ${chipClass(soloPendientes)}`}
        >
          Solo pendientes
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-app-secondary">Severidad:</span>
        {(['todas', 'critica', 'urgente', 'atencion', 'informativa'] as const).map((s) => (
          <Link
            key={s}
            href={buildHref(pathname, filters, { severidad: s })}
            className={`rounded-full px-3 py-1 capitalize ${chipClass(sev === s)}`}
          >
            {s === 'todas' ? 'Todas' : s === 'informativa' ? 'Novedad' : s}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-app-secondary">Orden:</span>
        <Link
          href={buildHref(pathname, filters, { orden: 'reciente' })}
          className={`rounded-full px-3 py-1 ${chipClass(orden === 'reciente')}`}
        >
          Más recientes
        </Link>
        <Link
          href={buildHref(pathname, filters, { orden: 'termino' })}
          className={`rounded-full px-3 py-1 ${chipClass(orden === 'termino')}`}
        >
          Fin de término (próximo)
        </Link>
      </div>
    </div>
  )
}
