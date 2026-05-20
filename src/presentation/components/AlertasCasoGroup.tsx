import Link from 'next/link'
import type { AlertasCasoGrupo } from '@/lib/alertas'
import { areaLabels, formatDateTimeCo, formatFechaCo } from '@/lib/labels'
import { parseSujetosProcesales } from '@/lib/sujetos-procesales'
import { AlertaCard } from '@/presentation/components/AlertaCard'

export function AlertasCasoGroup({ grupo }: { grupo: AlertasCasoGrupo }) {
  const { caso, alertas, pendientes } = grupo
  const sujetos = parseSujetosProcesales(caso.sujetos_procesales)
  const [principal, ...anteriores] = alertas

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 bg-slate-50/90 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{caso.numero_caso}</h2>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                {alertas.length} actuación(es)
              </span>
              {pendientes > 0 && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
                  {pendientes} sin leer
                </span>
              )}
              {caso.estado_critico && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-200">
                  Caso crítico
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-sm text-blue-700">
              <Link href={`/dashboard/casos/${grupo.caso_id}`} className="hover:underline">
                {caso.radicado_judicial}
              </Link>
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {areaLabels[caso.area]}
              {caso.tipo_proceso ? ` · ${caso.tipo_proceso}` : ''}
              {sujetos.demandado ? ` · ${sujetos.demandado}` : ''}
            </p>
            {caso.despacho && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{caso.despacho}</p>
            )}
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Última en Rama: {formatFechaCo(caso.fecha_ultima_actuacion_remota)}</p>
            <p className="mt-0.5">Sync: {formatDateTimeCo(caso.fecha_ultimo_scraping)}</p>
            <Link
              href={`/dashboard/casos/${grupo.caso_id}`}
              className="mt-2 inline-block font-medium text-blue-700 hover:underline"
            >
              Ver expediente →
            </Link>
          </div>
        </div>
      </header>

      <ul className="space-y-0 divide-y divide-slate-100 p-3 sm:p-4">
        {principal && <AlertaCard alerta={principal} />}
        {anteriores.length > 0 && (
          <li className="pt-2">
            <details className="group rounded-lg border border-slate-100 bg-slate-50/50">
              <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="text-slate-400 transition group-open:rotate-90"
                    aria-hidden
                  >
                    ▸
                  </span>
                  Ver {anteriores.length} actuación(es) anterior(es)
                </span>
              </summary>
              <ul className="space-y-2 border-t border-slate-100 p-3">
                {anteriores.map((a) => (
                  <AlertaCard key={a.id} alerta={a} compact />
                ))}
              </ul>
            </details>
          </li>
        )}
      </ul>
    </section>
  )
}
