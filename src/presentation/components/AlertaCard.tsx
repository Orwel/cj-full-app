import type { ActuacionResumen } from '@/lib/actuaciones'
import { diasHasta, formatDateTimeCo, formatFechaCo } from '@/lib/labels'
import type { Area } from '@/domain/entities/caso'
import { MarcarAlertaLeidaButton } from '@/presentation/components/MarcarAlertaLeidaButton'
import { SeverityBadge } from '@/presentation/components/SeverityBadge'

export type AlertaCardData = {
  id: string
  caso_id: string
  actuacion_id: string | null
  tipo_alerta: string
  titulo: string
  mensaje: string
  leida: boolean
  created_at: string
  casos: {
    numero_caso: string
    radicado_judicial: string
    area: Area
    despacho: string | null
    departamento: string | null
    tipo_proceso: string | null
    clase_proceso: string | null
    subclase_proceso: string | null
    ponente: string | null
    sujetos_procesales: string | null
    ubicacion: string | null
    estado_critico: boolean
    fecha_ultimo_scraping: string | null
    fecha_ultima_actuacion_remota: string | null
  } | null
  actuacion_alerta: ActuacionResumen | null
}

function plazoUrgencyClass(dias: number | null): string {
  if (dias === null) return 'text-slate-600'
  if (dias < 0) return 'font-semibold text-red-700'
  if (dias <= 2) return 'font-medium text-red-600'
  if (dias <= 5) return 'font-medium text-amber-700'
  return 'text-slate-700'
}

export function AlertaCard({
  alerta,
  compact = false,
}: {
  alerta: AlertaCardData
  compact?: boolean
}) {
  const act = alerta.actuacion_alerta
  const dias = act?.fecha_fin_termino ? diasHasta(act.fecha_fin_termino) : null
  const esNueva = act?.es_nueva === true

  if (!act) {
    return (
      <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Actuación no disponible.
      </li>
    )
  }

  return (
    <li
      className={`rounded-lg border transition-colors ${
        alerta.leida
          ? 'border-slate-100 bg-slate-50/80'
          : 'border-slate-200 bg-white shadow-sm ring-1 ring-slate-100'
      } ${compact ? 'text-sm' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severidad={alerta.tipo_alerta} />
            <span className="font-semibold tabular-nums text-slate-900">
              #{act.cons_actuacion}
            </span>
            <span className="text-xs text-slate-500">{formatFechaCo(act.fecha_actuacion)}</span>
            {esNueva && !alerta.leida && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">
                Nueva
              </span>
            )}
            {alerta.leida && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                Leída
              </span>
            )}
          </div>
          {!compact ? (
            <h3 className="text-base font-medium leading-snug text-slate-900">
              {act.actuacion.trim()}
            </h3>
          ) : (
            <p className="line-clamp-2 text-slate-800">{act.actuacion.trim()}</p>
          )}
        </div>
        {!alerta.leida && <MarcarAlertaLeidaButton alertaId={alerta.id} />}
      </div>

      {!compact && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3">
          {act.anotacion && (
            <p className="whitespace-pre-wrap text-sm text-slate-600">{act.anotacion.trim()}</p>
          )}
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Inicio término</dt>
              <dd className="text-slate-800">{formatFechaCo(act.fecha_inicio_termino)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Fin término</dt>
              <dd className={plazoUrgencyClass(dias)}>
                {formatFechaCo(act.fecha_fin_termino)}
                {dias !== null && (
                  <span className="ml-1 text-xs">
                    {dias < 0
                      ? `(vencido ${Math.abs(dias)}d)`
                      : dias === 0
                        ? '(hoy)'
                        : `(${dias}d)`}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Documentos</dt>
              <dd className="text-slate-800">
                {act.con_documentos ? 'Con documentos en portal' : 'Sin documentos en consulta'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Registrada en alerta</dt>
              <dd className="text-slate-600">{formatDateTimeCo(alerta.created_at)}</dd>
            </div>
          </dl>
        </div>
      )}
    </li>
  )
}
