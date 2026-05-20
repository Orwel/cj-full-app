/**
 * Severidad = max(plazo, patrón). Orden: critica > urgente > atencion > informativa.
 * Plazo: MVP con días corridos respecto a fecha_fin_termino (refinar a hábiles CO).
 * @see docs/SPEC.md §4
 */

export type Severidad = 'critica' | 'urgente' | 'atencion' | 'informativa'

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
 * Días corridos desde hoy (UTC) hasta fecha_fin (inclusive del sentido “plazo”):
 * positivo = aún falta; negativo = vencido.
 */
export function calendarDaysToEnd(fechaFinTermino: string, referenceDate: Date): number {
  const end = startOfUtcDay(parseDateOnlyUtc(fechaFinTermino))
  const ref = startOfUtcDay(referenceDate)
  return Math.round((end.getTime() - ref.getTime()) / 86_400_000)
}

/** MVP: umbrales como SPEC pero en días corridos. */
export function severityFromPlazo(
  fechaFinTermino: string | null,
  referenceDate: Date,
): Severidad {
  if (!fechaFinTermino) return 'informativa'
  const d = calendarDaysToEnd(fechaFinTermino, referenceDate)
  if (d < 0) return 'critica'
  if (d <= 3) return 'critica'
  if (d <= 7) return 'urgente'
  return 'atencion'
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

export function severidadActuacion(input: {
  actuacion: string
  anotacion: string | null
  fechaFinTermino: string | null
  referenceDate: Date
  /** Si false, no aplica patrones de texto (p. ej. actuaciones que no son la última del expediente). */
  evaluarPatrones?: boolean
}): Severidad {
  const patron =
    input.evaluarPatrones === false
      ? 'informativa'
      : severityFromPatrones(input.actuacion, input.anotacion)
  return maxSeverity(severityFromPlazo(input.fechaFinTermino, input.referenceDate), patron)
}
