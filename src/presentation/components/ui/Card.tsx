import type { ReactNode } from 'react'

type CardVariant = 'default' | 'muted' | 'brand'

const variants: Record<CardVariant, string> = {
  default: 'surface-card rounded-xl',
  muted: 'rounded-xl border border-app-border bg-app-muted',
  brand: 'rounded-xl border border-brand-100 bg-brand-50',
}

export function Card({
  variant = 'default',
  className = '',
  children,
}: {
  variant?: CardVariant
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`p-5 ${variants[variant]} ${className}`}>{children}</div>
  )
}
