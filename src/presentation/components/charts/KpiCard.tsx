import Link from 'next/link'
import { Card } from '@/presentation/components/ui/Card'

export function KpiCard({
  label,
  value,
  href,
  cta,
  highlight,
}: {
  label: string
  value: number
  href: string
  cta: string
  highlight?: boolean
}) {
  return (
    <Link href={href} className="group block">
      <Card
        variant="default"
        className={`transition-shadow hover:shadow-[var(--shadow-card-hover)] ${
          highlight ? 'ring-2 ring-amber-200' : ''
        }`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-app-muted-text">
          {label}
        </p>
        <p className="mt-2 text-2xl font-black text-app-text sm:text-3xl">{value}</p>
        <span className="mt-3 inline-block text-sm font-medium text-brand-700 group-hover:text-brand-600">
          {cta}
        </span>
      </Card>
    </Link>
  )
}
