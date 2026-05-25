import {
  estadoProcesoBadgeClass,
  estadoProcesoLabels,
} from '@/lib/labels'

export function EstadoProcesoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${estadoProcesoBadgeClass(estado)}`}
    >
      {estadoProcesoLabels[estado] ?? estado}
    </span>
  )
}
