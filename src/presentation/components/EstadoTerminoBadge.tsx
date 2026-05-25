import {
  estadoTerminoBadgeClass,
  estadoTerminoLabels,
} from '@/lib/labels'

export function EstadoTerminoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${estadoTerminoBadgeClass(estado)}`}
    >
      {estadoTerminoLabels[estado] ?? estado}
    </span>
  )
}
