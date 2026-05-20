import { severidadBadgeClass, severidadLabels } from '@/lib/labels'

export function SeverityBadge({ severidad }: { severidad: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${severidadBadgeClass(severidad)}`}
    >
      {severidadLabels[severidad] ?? severidad}
    </span>
  )
}
