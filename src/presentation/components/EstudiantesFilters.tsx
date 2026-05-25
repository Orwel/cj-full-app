import Link from 'next/link'

type FilterParams = {
  role?: string
  estado?: string
  q?: string
}

function buildHref(base: string, params: FilterParams, patch: Partial<FilterParams>) {
  const next = { ...params, ...patch }
  const sp = new URLSearchParams()
  if (next.role) sp.set('role', next.role)
  if (next.estado) sp.set('estado', next.estado)
  if (next.q) sp.set('q', next.q)
  const qs = sp.toString()
  return qs ? `${base}?${qs}` : base
}

function Chip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-sm transition-colors ${
        active
          ? 'bg-brand-700 text-white'
          : 'bg-slate-100 text-app-secondary hover:bg-slate-200'
      }`}
    >
      {children}
    </Link>
  )
}

export function EstudiantesFilters({ params }: { params: FilterParams }) {
  const base = '/dashboard/admin/estudiantes'

  return (
    <div className="mt-6 space-y-4">
      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {params.role && <input type="hidden" name="role" value={params.role} />}
        {params.estado && <input type="hidden" name="estado" value={params.estado} />}
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ''}
          placeholder="Buscar por nombre o correo…"
          className="w-full max-w-md rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-700/30"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Buscar
        </button>
      </form>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="self-center text-app-muted-text">Rol:</span>
        <Chip href={buildHref(base, params, { role: undefined })} active={!params.role}>
          Todos
        </Chip>
        <Chip
          href={buildHref(base, params, { role: 'student' })}
          active={params.role === 'student'}
        >
          Estudiantes
        </Chip>
        <Chip
          href={buildHref(base, params, { role: 'admin' })}
          active={params.role === 'admin'}
        >
          Administradores
        </Chip>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <span className="self-center text-app-muted-text">Estado:</span>
        <Chip href={buildHref(base, params, { estado: undefined })} active={!params.estado}>
          Todos
        </Chip>
        <Chip
          href={buildHref(base, params, { estado: 'con_casos' })}
          active={params.estado === 'con_casos'}
        >
          Con casos
        </Chip>
        <Chip
          href={buildHref(base, params, { estado: 'sin_casos' })}
          active={params.estado === 'sin_casos'}
        >
          Sin casos
        </Chip>
        <Chip
          href={buildHref(base, params, { estado: 'criticos' })}
          active={params.estado === 'criticos'}
        >
          Con críticos
        </Chip>
        <Chip
          href={buildHref(base, params, { estado: 'alertas' })}
          active={params.estado === 'alertas'}
        >
          Con alertas
        </Chip>
      </div>
    </div>
  )
}
