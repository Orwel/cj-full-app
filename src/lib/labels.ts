import type { Area } from '@/domain/entities/caso'

export const areaLabels: Record<Area, string> = {
  civil: 'Civil',
  laboral: 'Laboral',
  penal: 'Penal',
  familia: 'Familia',
  administrativo: 'Administrativo',
}

export const severidadLabels: Record<string, string> = {
  critica: 'Crítica',
  urgente: 'Urgente',
  atencion: 'Atención',
  informativa: 'Informativa',
}

export const estadoProcesoLabels: Record<string, string> = {
  abierto: 'Abierto',
  archivado: 'Archivado',
  indeterminado: 'Sin ubicación',
}

export const estadoTerminoLabels: Record<string, string> = {
  sin_termino: 'Sin plazo',
  vigente: 'Plazo vigente',
  por_vencer: 'Por vencer',
  vencido_sin_respuesta: 'Vencido sin respuesta',
  atendido: 'Plazo atendido',
  cerrado_proceso: 'Histórico (archivo)',
}

export function estadoProcesoBadgeClass(estado: string): string {
  switch (estado) {
    case 'archivado':
      return 'bg-slate-200 text-slate-800 ring-slate-300'
    case 'abierto':
      return 'bg-emerald-100 text-emerald-900 ring-emerald-200'
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200'
  }
}

export function estadoTerminoBadgeClass(estado: string): string {
  switch (estado) {
    case 'vencido_sin_respuesta':
      return 'bg-red-100 text-red-800 ring-red-200'
    case 'por_vencer':
      return 'bg-amber-100 text-amber-900 ring-amber-200'
    case 'vigente':
      return 'bg-blue-50 text-blue-800 ring-blue-200'
    case 'atendido':
    case 'cerrado_proceso':
      return 'bg-slate-100 text-slate-600 ring-slate-200'
    default:
      return 'bg-slate-50 text-slate-500 ring-slate-100'
  }
}

/** Texto bajo la fecha de fin de término según estado y días restantes. */
export function plazoSubtext(
  estadoTermino: string | null | undefined,
  dias: number | null,
): string | null {
  if (!estadoTermino || estadoTermino === 'sin_termino') return null
  if (estadoTermino === 'atendido') return 'Plazo atendido'
  if (estadoTermino === 'cerrado_proceso') return 'Histórico'
  if (estadoTermino === 'vencido_sin_respuesta' && dias !== null) {
    return `Vencido ${Math.abs(dias)}d`
  }
  if (dias === null) return null
  if (dias < 0) return `Vencido ${Math.abs(dias)}d`
  if (dias === 0) return 'Hoy'
  return `${dias}d`
}

export function severidadBadgeClass(severidad: string): string {
  switch (severidad) {
    case 'critica':
      return 'bg-red-100 text-red-800 ring-red-200'
    case 'urgente':
      return 'bg-amber-100 text-amber-900 ring-amber-200'
    case 'atencion':
      return 'bg-yellow-50 text-yellow-900 ring-yellow-200'
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200'
  }
}

export function formatFechaCo(value: string | null | undefined): string {
  if (!value) return '—'
  const d = value.length <= 10 ? new Date(`${value}T12:00:00`) : new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTimeCo(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function diasHasta(fechaFin: string | null): number | null {
  if (!fechaFin) return null
  const fin = new Date(`${fechaFin}T23:59:59`)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.ceil((fin.getTime() - hoy.getTime()) / 86_400_000)
}
