/**
 * Copia lógica de `src/domain/services/alert-severity.ts` para Edge (Deno).
 * Mantener alineado al sincronizar reglas de negocio.
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

export function parseDateOnlyUtc(isoDate: string): Date {
  const [y, m, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

export function calendarDaysToEnd(fechaFinTermino: string, referenceDate: Date): number {
  const end = startOfUtcDay(parseDateOnlyUtc(fechaFinTermino))
  const ref = startOfUtcDay(referenceDate)
  return Math.round((end.getTime() - ref.getTime()) / 86_400_000)
}

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
  evaluarPatrones?: boolean
}): Severidad {
  const patron =
    input.evaluarPatrones === false
      ? 'informativa'
      : severityFromPatrones(input.actuacion, input.anotacion)
  return maxSeverity(severityFromPlazo(input.fechaFinTermino, input.referenceDate), patron)
}
