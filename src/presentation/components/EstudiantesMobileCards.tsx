import Link from 'next/link'
import type { StudentOverviewRow } from '@/lib/analytics/students-overview'
import { StudentRoleSelect } from '@/presentation/components/StudentRoleSelect'

export function EstudiantesMobileCards({
  rows,
  currentAdminId,
}: {
  rows: StudentOverviewRow[]
  currentAdminId: string
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-app-border bg-app-surface px-4 py-8 text-center text-sm text-app-muted-text md:hidden">
        No hay perfiles que coincidan con el filtro.
      </p>
    )
  }

  return (
    <ul className="space-y-3 md:hidden">
      {rows.map((r) => (
        <li key={r.id} className="surface-card rounded-xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-app-text">{r.full_name}</p>
              <p className="truncate text-xs text-app-secondary">{r.email}</p>
            </div>
            {!r.is_active && (
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                Inactivo
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-app-secondary">
            <span>{r.casos_activos} caso(s)</span>
            {r.casos_criticos > 0 && (
              <span className="text-red-700">{r.casos_criticos} crítico(s)</span>
            )}
            {r.alertas_pendientes > 0 && (
              <span className="text-amber-700">{r.alertas_pendientes} alerta(s)</span>
            )}
            {r.telegram_conectado && <span className="text-emerald-700">Telegram</span>}
          </div>
          <div className="mt-3">
            <StudentRoleSelect
              studentId={r.id}
              currentRole={r.role}
              disabled={r.id === currentAdminId}
            />
          </div>
          <Link
            href={`/dashboard/admin/estudiantes/${r.id}`}
            className="mt-3 inline-block text-sm font-medium text-brand-700"
          >
            Ver detalle →
          </Link>
        </li>
      ))}
    </ul>
  )
}
