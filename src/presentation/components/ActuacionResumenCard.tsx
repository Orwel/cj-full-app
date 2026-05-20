import Link from 'next/link'
import type { ActuacionResumen } from '@/lib/actuaciones'
import { diasHasta, formatFechaCo } from '@/lib/labels'
import { SeverityBadge } from '@/presentation/components/SeverityBadge'

export function ActuacionResumenCard({
  act,
  casoId,
  destacar = false,
}: {
  act: ActuacionResumen
  casoId: string
  destacar?: boolean
}) {
  const dias = diasHasta(act.fecha_fin_termino)

  return (
    <div className={`rounded-lg border px-3 py-3 text-sm ${
        destacar ? 'border-blue-200 bg-blue-50/60' : 'border-slate-100 bg-slate-50/80'
      }`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold tabular-nums text-slate-900">#{act.cons_actuacion}</span>
        {destacar && (
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
            Última
          </span>
        )}
        <span className="text-xs text-slate-500">{formatFechaCo(act.fecha_actuacion)}</span>
        <SeverityBadge severidad={act.severidad} />
      </div>
      <p className="mt-2 text-slate-800">{act.actuacion.trim()}</p>
      {act.anotacion && (
        <p className="mt-1 text-xs text-slate-500">{act.anotacion.trim()}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
        {act.fecha_fin_termino ? (
          <span>
            Fin término: {formatFechaCo(act.fecha_fin_termino)}
            {dias !== null &&
              (dias < 0
                ? ` (vencido ${Math.abs(dias)}d)`
                : dias === 0
                  ? ' (hoy)'
                  : ` (${dias}d)`)}
          </span>
        ) : (
          <span>Sin plazo registrado</span>
        )}
        <span>{act.con_documentos ? 'Con documentos' : 'Sin documentos'}</span>
      </div>
      <Link
        href={`/dashboard/casos/${casoId}`}
        className="mt-3 inline-block text-xs font-medium text-blue-700 hover:underline"
      >
        Ver expediente completo →
      </Link>
    </div>
  )
}
