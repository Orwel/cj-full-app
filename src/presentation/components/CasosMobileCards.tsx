import Link from 'next/link'
import type { Caso } from '@/domain/entities/caso'
import { areaLabels, formatDateTimeCo } from '@/lib/labels'
import { parseSujetosProcesales } from '@/lib/sujetos-procesales'

export function CasosMobileCards({
  casos,
  isAdmin,
  studentNameById,
}: {
  casos: Caso[]
  isAdmin: boolean
  studentNameById: Record<string, string>
}) {
  if (casos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-app-border bg-app-surface px-4 py-8 text-center text-sm text-app-muted-text">
        No hay casos. Crea el primero.
      </p>
    )
  }

  return (
    <ul className="space-y-3 md:hidden">
      {casos.map((c) => {
        const { demandante, demandado } = parseSujetosProcesales(c.sujetosProcesales)
        return (
          <li key={c.id} className="surface-card rounded-xl p-4">
            <Link href={`/dashboard/casos/${c.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-app-text">{c.numeroCaso}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-app-secondary">
                    {c.radicadoJudicial}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-app-secondary">
                  {areaLabels[c.area]}
                </span>
              </div>
              {(demandante || demandado) && (
                <p className="mt-2 line-clamp-2 text-sm text-app-secondary">
                  {demandante && (
                    <span>
                      <span className="font-medium text-app-text">Dte: </span>
                      {demandante}
                    </span>
                  )}
                  {demandante && demandado ? ' · ' : null}
                  {demandado && (
                    <span>
                      <span className="font-medium text-app-text">Ddo: </span>
                      {demandado}
                    </span>
                  )}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {c.estadoCritico && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    Crítico
                  </span>
                )}
                <span className="text-xs text-app-muted-text">
                  Sync {formatDateTimeCo(c.fechaUltimoScraping)}
                </span>
                {isAdmin && c.studentId && (
                  <span className="text-xs text-app-muted-text">
                    · {studentNameById[c.studentId] ?? 'Estudiante'}
                  </span>
                )}
              </div>
            </Link>
            <div className="mt-3 flex gap-4 border-t border-app-border pt-3 text-sm font-medium">
              <Link href={`/dashboard/casos/${c.id}`} className="text-brand-700">
                Ver expediente
              </Link>
              <Link href={`/dashboard/casos/${c.id}/editar`} className="text-app-secondary">
                Editar
              </Link>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
