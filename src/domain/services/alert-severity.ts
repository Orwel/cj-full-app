/**
 * Severidad = max(plazo_vivo, patrón) con tope según estado del proceso y del término.
 * @see docs/SPEC.md §4, docs/ANALISIS-ALERTAS-2026-05.md
 */

export type Severidad = 'critica' | 'urgente' | 'atencion' | 'informativa'

export type EstadoProceso = 'abierto' | 'archivado' | 'indeterminado'

export type EstadoTermino =
  | 'sin_termino'
  | 'vigente'
  | 'por_vencer'
  | 'vencido_sin_respuesta'
  | 'atendido'
  | 'cerrado_proceso'

const RANK: Record<Severidad, number> = {
  critica: 4,
  urgente: 3,
  atencion: 2,
  informativa: 1,
}

export function maxSeverity(a: Severidad, b: Severidad): Severidad {
  return RANK[a] >= RANK[b] ? a : b
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** `YYYY-MM-DD` → UTC medianoche del día. */
export function parseDateOnlyUtc(isoDate: string): Date {
  const [y, m, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

/**
 * Días corridos desde hoy (UTC) hasta fecha_fin:
 * positivo = aún falta; negativo = vencido.
 */
export function calendarDaysToEnd(fechaFinTermino: string, referenceDate: Date): number {
  const end = startOfUtcDay(parseDateOnlyUtc(fechaFinTermino))
  const ref = startOfUtcDay(referenceDate)
  return Math.round((end.getTime() - ref.getTime()) / 86_400_000)
}

const PATRONES_CIERRE_PROCESO = [
  'archivo del expediente',
  'archivo',
  'ejecutoria',
  'terminación',
  'terminacion',
  'caducidad',
  'desistimiento',
] as const

/** Estado del expediente según ubicación API y última actuación. */
export function resolveEstadoProceso(
  ubicacion: string | null,
  ultimaActuacion?: { actuacion: string; anotacion: string | null },
): EstadoProceso {
  const u = (ubicacion ?? '').trim().toLowerCase()
  if (u.includes('archivo')) return 'archivado'

  if (ultimaActuacion) {
    const texto = `${ultimaActuacion.actuacion}\n${ultimaActuacion.anotacion ?? ''}`.toLowerCase()
    if (PATRONES_CIERRE_PROCESO.some((n) => texto.includes(n))) return 'archivado'
  }

  if (!ubicacion || u.includes('sin ubicacion')) return 'indeterminado'
  return 'abierto'
}

export type ActuacionForRecompute = {
  id: string
  cons_actuacion: number
  actuacion: string
  anotacion: string | null
  fecha_fin_termino: string | null
}

export type ActuacionRecomputeResult = {
  id: string
  estado_termino: EstadoTermino
  severidad: Severidad
}

/** MVP: umbrales en días corridos (refinar a hábiles CO). */
export function severityFromPlazoVivo(
  estadoTermino: EstadoTermino,
  fechaFinTermino: string | null,
  referenceDate: Date,
): Severidad {
  if (
    estadoTermino === 'sin_termino' ||
    estadoTermino === 'atendido' ||
    estadoTermino === 'cerrado_proceso'
  ) {
    return 'informativa'
  }
  if (!fechaFinTermino) return 'informativa'

  const d = calendarDaysToEnd(fechaFinTermino, referenceDate)
  if (estadoTermino === 'vencido_sin_respuesta') return 'critica'
  if (estadoTermino === 'por_vencer') {
    if (d <= 3) return 'critica'
    return 'urgente'
  }
  if (estadoTermino === 'vigente') return 'atencion'
  return 'informativa'
}

/** Lista viva: coincidencia por substring insensible a mayúsculas. */
export const PATRONES_ALERTA: ReadonlyArray<{
  needles: readonly string[]
  severidad: Severidad
}> = [
  { needles: ['demanda rechazada'], severidad: 'critica' },
  { needles: ['desistimiento tácito', 'desistimiento tacito'], severidad: 'critica' },
  { needles: ['sentencia', 'fallo'], severidad: 'urgente' },
  { needles: ['nulidad'], severidad: 'urgente' },
  { needles: ['apelación', 'apelacion'], severidad: 'atencion' },
  { needles: ['traslado'], severidad: 'atencion' },
  { needles: ['auto admisorio'], severidad: 'atencion' },
  { needles: ['ejecutoria'], severidad: 'atencion' },
]

export function severityFromPatrones(actuacion: string, anotacion: string | null): Severidad {
  const texto = `${actuacion}\n${anotacion ?? ''}`.toLowerCase()
  let best: Severidad = 'informativa'
  for (const rule of PATRONES_ALERTA) {
    if (rule.needles.some((n) => texto.includes(n.toLowerCase()))) {
      best = maxSeverity(best, rule.severidad)
    }
  }
  return best
}

function capPatronEnArchivo(patron: Severidad): Severidad {
  return maxSeverity('informativa', patron === 'critica' ? 'atencion' : patron)
}

export function computeEstadoTermino(input: {
  fechaFinTermino: string | null
  tienePosterior: boolean
  estadoProceso: EstadoProceso
  referenceDate: Date
}): EstadoTermino {
  if (!input.fechaFinTermino) return 'sin_termino'
  if (input.estadoProceso === 'archivado') return 'cerrado_proceso'
  if (input.tienePosterior) return 'atendido'

  const d = calendarDaysToEnd(input.fechaFinTermino, input.referenceDate)
  if (d < 0) return 'vencido_sin_respuesta'
  if (d <= 7) return 'por_vencer'
  return 'vigente'
}

export function severidadActuacion(input: {
  actuacion: string
  anotacion: string | null
  fechaFinTermino: string | null
  referenceDate: Date
  estadoProceso: EstadoProceso
  tienePosterior: boolean
  esUltimaDelExpediente: boolean
}): { severidad: Severidad; estado_termino: EstadoTermino } {
  const estado_termino = computeEstadoTermino({
    fechaFinTermino: input.fechaFinTermino,
    tienePosterior: input.tienePosterior,
    estadoProceso: input.estadoProceso,
    referenceDate: input.referenceDate,
  })

  const evaluarPatrones =
    input.esUltimaDelExpediente ||
    (!input.tienePosterior &&
      (estado_termino === 'vigente' ||
        estado_termino === 'por_vencer' ||
        estado_termino === 'vencido_sin_respuesta'))

  const patron = evaluarPatrones
    ? severityFromPatrones(input.actuacion, input.anotacion)
    : 'informativa'

  const patronAjustado =
    input.estadoProceso === 'archivado' ? capPatronEnArchivo(patron) : patron

  const plazo = severityFromPlazoVivo(
    estado_termino,
    input.fechaFinTermino,
    input.referenceDate,
  )

  let severidad = maxSeverity(plazo, patronAjustado)
  if (input.estadoProceso === 'archivado' && estado_termino !== 'sin_termino') {
    severidad = maxSeverity('informativa', severidad)
  }

  return { severidad, estado_termino }
}

export type RecomputeCasoResult = {
  estadoProceso: EstadoProceso
  actuaciones: ActuacionRecomputeResult[]
  hayCritica: boolean
}

/** Recalcula estados y severidad de todas las actuaciones de un caso. */
export function recomputeCaso(input: {
  ubicacion: string | null
  actuaciones: ActuacionForRecompute[]
  referenceDate: Date
}): RecomputeCasoResult {
  const list = [...input.actuaciones].sort((a, b) => a.cons_actuacion - b.cons_actuacion)
  const maxCons = list.reduce((m, a) => Math.max(m, a.cons_actuacion), 0)
  const ultima = list.find((a) => a.cons_actuacion === maxCons)

  const estadoProceso = resolveEstadoProceso(input.ubicacion, ultima)

  const actuaciones: ActuacionRecomputeResult[] = []
  let hayCritica = false

  for (const a of list) {
    const tienePost = list.some((o) => o.cons_actuacion > a.cons_actuacion)

    const { severidad, estado_termino } = severidadActuacion({
      actuacion: a.actuacion,
      anotacion: a.anotacion,
      fechaFinTermino: a.fecha_fin_termino,
      referenceDate: input.referenceDate,
      estadoProceso,
      tienePosterior: tienePost,
      esUltimaDelExpediente: a.cons_actuacion === maxCons,
    })

    if (severidad === 'critica' && estadoProceso === 'abierto') hayCritica = true

    actuaciones.push({ id: a.id, estado_termino, severidad })
  }

  return { estadoProceso, actuaciones, hayCritica }
}
