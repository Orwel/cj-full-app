/**
 * Cliente HTTP contra la API pública de consulta procesos.
 * @see docs/SCRAPING.md
 */

import type {
  ActuacionesResponse,
  ProcesoConsultaResponse,
  ProcesoDetalle,
} from './types'

const BASE_URL = 'https://consultaprocesos.ramajudicial.gov.co:448/api/v2'

const defaultHeaders: HeadersInit = {
  accept: 'application/json',
  'user-agent': 'CJ-Consultorio-Monitor/1.0',
}

const DEFAULT_TIMEOUT_MS = Number(
  process.env.SCRAPING_TIMEOUT_MS ?? 30_000,
)

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: defaultHeaders,
    cache: 'no-store',
    signal: AbortSignal.timeout(
      Number.isFinite(DEFAULT_TIMEOUT_MS) && DEFAULT_TIMEOUT_MS > 0
        ? DEFAULT_TIMEOUT_MS
        : 30_000,
    ),
  })
  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Rama Judicial ${res.status} @ ${url}`)
  }
  return (await res.json()) as T
}

export const RamaJudicialClient = {
  baseUrl: BASE_URL,

  consultaNumeroRadicacion(numero: string, pagina = 1) {
    const q = new URLSearchParams({
      numero,
      SoloActivos: 'false',
      pagina: String(pagina),
    })
    const url = `${BASE_URL}/Procesos/Consulta/NumeroRadicacion?${q.toString()}`
    return getJson<ProcesoConsultaResponse>(url)
  },

  detalle(idProceso: number) {
    return getJson<ProcesoDetalle>(`${BASE_URL}/Proceso/Detalle/${idProceso}`)
  },

  actuaciones(idProceso: number, pagina = 1) {
    const q = new URLSearchParams({ pagina: String(pagina) })
    return getJson<ActuacionesResponse>(
      `${BASE_URL}/Proceso/Actuaciones/${idProceso}?${q.toString()}`,
    )
  },
}
