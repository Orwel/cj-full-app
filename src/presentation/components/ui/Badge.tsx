import type { ReactNode } from 'react'
import { severidadBadgeClass, severidadLabels } from '@/lib/labels'

type BadgeTone = 'default' | 'brand' | 'warning' | 'danger' | 'success' | 'muted'

const tones: Record<BadgeTone, string> = {
  default: 'bg-slate-100 text-slate-700 ring-slate-200',
  brand: 'bg-brand-50 text-brand-800 ring-brand-100',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
  danger: 'bg-red-50 text-red-800 ring-red-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  muted: 'bg-slate-100 text-slate-600 ring-slate-200',
}

export function Badge({
  children,
  tone = 'default',
  className = '',
}: {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

export function SeverityBadge({
  severidad,
  className = '',
}: {
  severidad: string
  className?: string
}) {
  const cls = severidadBadgeClass(severidad)
  const label = severidadLabels[severidad] ?? severidad
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${cls} ${className}`}
    >
      {label}
    </span>
  )
}
