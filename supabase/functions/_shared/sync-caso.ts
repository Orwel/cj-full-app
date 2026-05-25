import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { apiDateToSqlDate } from './dates.ts'
import { recomputeSeverityAlertsAndEstadoCritico } from './recompute.ts'

const BASE_URL = 'https://consultaprocesos.ramajudicial.gov.co:448/api/v2'
const RADICADO_RE = /^[0-9]{23}$/

const defaultHeaders: HeadersInit = {
  accept: 'application/json',
  'user-agent': 'CJ-Consultorio-Monitor/1.0 (edge-job)',
}

export type CasoSyncRow = {
  id: string
  radicado_judicial: string
  id_proceso: number | null
  fecha_ultima_actuacion_remota: string | null
}

export type ScrapingLogStatus =
  | 'success'
  | 'error'
  | 'not_found'
  | 'invalid_format'
  | 'no_changes'

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function getJsonWithRetry<T>(url: string, maxAttempts = 3): Promise<T | null> {
  let last: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        headers: defaultHeaders,
        signal: AbortSignal.timeout(30_000),
      })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`Rama Judicial ${res.status}`)
      return (await res.json()) as T
    } catch (e) {
      last = e
      if (attempt < maxAttempts - 1) {
        await sleep(400 * 2 ** attempt)
      }
    }
  }
  throw last instanceof Error ? last : new Error(String(last))
}

type ActuacionApi = {
  idRegActuacion: number
  consActuacion: number
  fechaActuacion: string
  actuacion: string
  anotacion: string | null
  fechaInicial: string | null
  fechaFinal: string | null
  fechaRegistro: string
  codRegla: string
  conDocumentos: boolean
}

type ProcesoListItem = {
  idProceso: number
  idConexion: number
  llaveProceso: string
  fechaProceso: string
  fechaUltimaActuacion: string
  despacho: string
  departamento: string
  sujetosProcesales: string
  esPrivado: boolean
}

type ProcesoConsultaResponse = { procesos?: ProcesoListItem[] }
type ProcesoDetalle = {
  idRegProceso: number
  codDespachoCompleto: string
  ponente: string | null
  tipoProceso: string
  claseProceso: string
  subclaseProceso: string | null
  recurso: string
  ubicacion: string
}
type ActuacionesResponse = {
  actuaciones?: ActuacionApi[]
  paginacion?: { cantidadPaginas?: number; pagina?: number }
}

async function insertScrapingLog(
  admin: SupabaseClient,
  input: {
    casoId: string | null
    radicado: string
    status: ScrapingLogStatus
    errorMessage?: string | null
    actuacionesNuevas: number
    durationMs: number
  },
): Promise<void> {
  const { error } = await admin.from('scraping_logs').insert({
    caso_id: input.casoId,
    radicado: input.radicado,
    status: input.status,
    error_message: input.errorMessage ?? null,
    actuaciones_nuevas: input.actuacionesNuevas,
    duration_ms: input.durationMs,
  })
  if (error) throw new Error(error.message)
}

export function isPermanentScrapingFailure(status: ScrapingLogStatus): boolean {
  return status === 'invalid_format' || status === 'not_found'
}

export async function syncJudicialCaso(
  admin: SupabaseClient,
  caso: CasoSyncRow,
): Promise<{ status: ScrapingLogStatus; actuacionesNuevas: number; error?: string }> {
  const started = Date.now()
  const radicado = caso.radicado_judicial.trim()
  const finish = async (
    status: ScrapingLogStatus,
    actuacionesNuevas: number,
    errorMessage: string | null,
  ) => {
    await insertScrapingLog(admin, {
      casoId: caso.id,
      radicado,
      status,
      errorMessage,
      actuacionesNuevas,
      durationMs: Date.now() - started,
    })
  }

  if (!RADICADO_RE.test(radicado)) {
    await finish('invalid_format', 0, 'Radicado debe tener 23 dígitos')
    return { status: 'invalid_format', actuacionesNuevas: 0, error: 'invalid_format' }
  }

  try {
    const q = new URLSearchParams({
      numero: radicado,
      SoloActivos: 'false',
      pagina: '1',
    })
    const listUrl = `${BASE_URL}/Procesos/Consulta/NumeroRadicacion?${q}`
    const listRes = await getJsonWithRetry<ProcesoConsultaResponse>(listUrl)
    const procesos = listRes?.procesos ?? []
    if (procesos.length === 0) {
      await finish('not_found', 0, 'Sin procesos')
      return { status: 'not_found', actuacionesNuevas: 0 }
    }

    const proceso =
      procesos.find((p) => p.llaveProceso.replace(/\D/g, '') === radicado) ?? procesos[0]

    const fechaUltimaApi = apiDateToSqlDate(proceso.fechaUltimaActuacion)
    const fechaRemotaDb = caso.fecha_ultima_actuacion_remota

    if (
      caso.id_proceso != null &&
      proceso.idProceso === caso.id_proceso &&
      fechaUltimaApi != null &&
      fechaUltimaApi === fechaRemotaDb
    ) {
      await admin
        .from('casos')
        .update({ fecha_ultimo_scraping: new Date().toISOString() })
        .eq('id', caso.id)
      await recomputeSeverityAlertsAndEstadoCritico(admin, caso.id)
      await finish('no_changes', 0, null)
      return { status: 'no_changes', actuacionesNuevas: 0 }
    }

    const detalle = await getJsonWithRetry<ProcesoDetalle>(
      `${BASE_URL}/Proceso/Detalle/${proceso.idProceso}`,
    )
    if (!detalle) {
      await finish('error', 0, 'Detalle vacío')
      return { status: 'error', actuacionesNuevas: 0, error: 'detalle' }
    }

    const primera = await getJsonWithRetry<ActuacionesResponse>(
      `${BASE_URL}/Proceso/Actuaciones/${proceso.idProceso}?pagina=1`,
    )
    const totalPaginas = Math.max(1, primera?.paginacion?.cantidadPaginas ?? 1)
    const todas: ActuacionApi[] = [...(primera?.actuaciones ?? [])]
    for (let p = 2; p <= totalPaginas; p++) {
      const pag = await getJsonWithRetry<ActuacionesResponse>(
        `${BASE_URL}/Proceso/Actuaciones/${proceso.idProceso}?pagina=${p}`,
      )
      todas.push(...(pag?.actuaciones ?? []))
    }

    const { data: existRows, error: exErr } = await admin
      .from('actuaciones')
      .select('id_reg_actuacion, cons_actuacion')
      .eq('caso_id', caso.id)
    if (exErr) throw new Error(exErr.message)
    const existentes = new Set((existRows ?? []).map((r) => Number(r.id_reg_actuacion)))
    const nuevas = todas.filter((a) => !existentes.has(a.idRegActuacion))

    const despacho = proceso.despacho?.trim() ?? proceso.despacho

    const { error: upErr } = await admin
      .from('casos')
      .update({
        id_proceso: proceso.idProceso,
        id_conexion: proceso.idConexion,
        despacho,
        departamento: proceso.departamento,
        sujetos_procesales: proceso.sujetosProcesales,
        fecha_proceso: apiDateToSqlDate(proceso.fechaProceso),
        fecha_ultima_actuacion_remota: fechaUltimaApi,
        es_privado: proceso.esPrivado,
        id_reg_proceso: detalle.idRegProceso,
        cod_despacho_completo: detalle.codDespachoCompleto,
        ponente: detalle.ponente,
        tipo_proceso: detalle.tipoProceso,
        clase_proceso: detalle.claseProceso,
        subclase_proceso: detalle.subclaseProceso,
        recurso: detalle.recurso,
        ubicacion: detalle.ubicacion,
        fecha_ultimo_scraping: new Date().toISOString(),
      })
      .eq('id', caso.id)
    if (upErr) throw new Error(upErr.message)

    const now = new Date().toISOString()
    if (nuevas.length > 0) {
      const rows = nuevas.map((a) => {
        const fechaFin = apiDateToSqlDate(a.fechaFinal)
        return {
          caso_id: caso.id,
          id_reg_actuacion: a.idRegActuacion,
          cons_actuacion: a.consActuacion,
          fecha_actuacion: apiDateToSqlDate(a.fechaActuacion) ?? '1970-01-01',
          actuacion: a.actuacion.trim(),
          anotacion: a.anotacion?.trim() ?? null,
          fecha_inicio_termino: apiDateToSqlDate(a.fechaInicial),
          fecha_fin_termino: fechaFin,
          fecha_registro:
            apiDateToSqlDate(a.fechaRegistro) ??
            apiDateToSqlDate(a.fechaActuacion) ??
            '1970-01-01',
          con_documentos: a.conDocumentos,
          cod_regla: (a.codRegla ?? '').trim(),
          severidad: 'informativa',
          estado_termino: 'sin_termino',
          es_nueva: true,
          scraped_at: now,
        }
      })
      const chunk = 200
      for (let i = 0; i < rows.length; i += chunk) {
        const slice = rows.slice(i, i + chunk)
        const { error } = await admin.from('actuaciones').insert(slice)
        if (error) throw new Error(error.message)
      }
    }

    await recomputeSeverityAlertsAndEstadoCritico(admin, caso.id)
    await finish('success', nuevas.length, null)
    return { status: 'success', actuacionesNuevas: nuevas.length }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    try {
      await finish('error', 0, msg)
    } catch {
      /* ignore */
    }
    return { status: 'error', actuacionesNuevas: 0, error: msg }
  }
}
