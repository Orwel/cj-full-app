import Link from 'next/link'
import type { ActuacionResumen } from '@/lib/actuaciones'
import { diasHasta, formatFechaCo, plazoSubtext } from '@/lib/labels'
import { SeverityBadge } from '@/presentation/components/SeverityBadge'

export function UltimasActuacionesList({
  actuaciones,
  casoId,
  titulo = 'Últimas actuaciones del proceso',
  maxItems = 5,
}: {
  actuaciones: ActuacionResumen[]
  casoId: string
  titulo?: string
  maxItems?: number
}) {
  const list = actuaciones.slice(0, maxItems)
  if (list.length === 0) {
    return (
      <p className="text-sm text-slate-500">No hay actuaciones sincronizadas para este caso.</p>
    )
  }

  const maxCons = Math.max(...list.map((a) => a.cons_actuacion))

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {titulo}
        </h4>
        <Link
          href={`/dashboard/casos/${casoId}`}
          className="text-xs font-medium text-blue-700 hover:underline"
        >
          Ver expediente completo →
        </Link>
      </div>
      <ul className="mt-3 space-y-2">
        {list.map((a) => {
          const dias = diasHasta(a.fecha_fin_termino)
          const esUltima = a.cons_actuacion === maxCons
          return (
            <li
              key={a.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                esUltima
                  ? 'border-blue-200 bg-blue-50/60'
                  : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold tabular-nums text-slate-900">
                  #{a.cons_actuacion}
                </span>
                {esUltima && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                    Última
                  </span>
                )}
                <span className="text-xs text-slate-500">{formatFechaCo(a.fecha_actuacion)}</span>
                <SeverityBadge severidad={a.severidad} />
              </div>
              <p className="mt-1 line-clamp-2 text-slate-800">{a.actuacion.trim()}</p>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
                {a.fecha_fin_termino ? (
                  <span>
                    Fin término: {formatFechaCo(a.fecha_fin_termino)}
                    {plazoSubtext(a.estado_termino, dias) &&
                      ` (${plazoSubtext(a.estado_termino, dias)})`}
                  </span>
                ) : (
                  <span>Sin plazo registrado</span>
                )}
                <span>{a.con_documentos ? 'Con documentos' : 'Sin documentos'}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
