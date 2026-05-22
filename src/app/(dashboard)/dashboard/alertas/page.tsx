import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/lib/auth/session'
import { groupAlertasPorCaso, sortAlertas } from '@/lib/alertas'
import { normalizeActuacionJoin } from '@/lib/actuaciones'
import type { AlertaCardData } from '@/presentation/components/AlertaCard'
import { AlertasCasoGroup } from '@/presentation/components/AlertasCasoGroup'
import {
  AlertasFilters,
  type AlertasFilterState,
} from '@/presentation/components/AlertasFilters'
import { MarcarTodasAlertasLeidasButton } from '@/presentation/components/MarcarTodasAlertasLeidasButton'

const ACTUACION_FIELDS = `
  id, cons_actuacion, fecha_actuacion, actuacion, anotacion,
  fecha_inicio_termino, fecha_fin_termino, fecha_registro,
  con_documentos, severidad, es_nueva
`

function parseFilters(sp: {
  pendientes?: string
  severidad?: string
  orden?: string
}): AlertasFilterState {
  return {
    pendientes: sp.pendientes === '1',
    severidad: sp.severidad ?? 'todas',
    orden: sp.orden ?? 'reciente',
  }
}

export default async function AlertasPage({
  searchParams,
}: {
  searchParams: Promise<{ pendientes?: string; severidad?: string; orden?: string }>
}) {
  const profile = await getMyProfile()
  if (!profile) return null

  const sp = await searchParams
  const filters = parseFilters(sp)

  const supabase = await createClient()
  let query = supabase
    .from('alertas')
    .select(
      `id, caso_id, actuacion_id, tipo_alerta, titulo, mensaje, leida, created_at,
       casos (
         numero_caso, radicado_judicial, area, despacho, departamento,
         tipo_proceso, clase_proceso, subclase_proceso, ponente, sujetos_procesales,
         ubicacion, estado_critico, fecha_ultimo_scraping, fecha_ultima_actuacion_remota
       ),
       actuaciones ( ${ACTUACION_FIELDS} )`,
    )
    .order('created_at', { ascending: false })
    .limit(500)

  if (filters.pendientes) {
    query = query.eq('leida', false)
  }
  if (filters.severidad && filters.severidad !== 'todas') {
    query = query.eq('tipo_alerta', filters.severidad)
  }

  const { data, error } = await query

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-app-text">Alertas</h1>
        <p className="mt-2 text-sm text-red-600">{error.message}</p>
      </div>
    )
  }

  const rows: AlertaCardData[] = (data ?? []).map((r) => {
    const actJoin = normalizeActuacionJoin(r.actuaciones, r.actuacion_id as string | null)
    const casoRaw = r.casos as unknown
    const caso = Array.isArray(casoRaw) ? casoRaw[0] : casoRaw

    return {
      id: r.id as string,
      caso_id: r.caso_id as string,
      actuacion_id: r.actuacion_id as string | null,
      tipo_alerta: r.tipo_alerta as string,
      titulo: r.titulo as string,
      mensaje: r.mensaje as string,
      leida: r.leida as boolean,
      created_at: r.created_at as string,
      casos: caso as AlertaCardData['casos'],
      actuacion_alerta: actJoin,
    }
  })

  const sorted = sortAlertas(rows, filters.orden ?? 'reciente')
  const grupos = groupAlertasPorCaso(sorted)
  const pendientes = sorted.filter((r) => !r.leida).length

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text sm:text-2xl">Actualizaciones</h1>
          <p className="mt-1 max-w-2xl text-sm text-app-secondary">
            Cada actuación sincronizada de la Rama Judicial aparece aquí. La severidad solo
            resalta plazos y patrones; el orden sigue el consecutivo del expediente.{' '}
            {pendientes > 0 ? (
              <span className="font-medium text-amber-700">{pendientes} sin leer</span>
            ) : (
              <span className="text-emerald-700">Todo leído</span>
            )}
          </p>
        </div>
        <MarcarTodasAlertasLeidasButton
          count={pendientes}
          severidad={filters.severidad}
        />
      </div>

      <div className="mt-6">
        <AlertasFilters filters={filters} />
      </div>

      {grupos.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-app-border bg-app-surface px-4 py-8 text-center text-sm text-app-muted-text">
          No hay actuaciones con estos filtros. Sincroniza un caso desde Expedientes para
          cargar el historial.
        </p>
      ) : (
        <ul className="mt-8 space-y-8">
          {grupos.map((g) => (
            <li key={g.caso_id}>
              <AlertasCasoGroup grupo={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
