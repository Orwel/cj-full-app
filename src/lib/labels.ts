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
