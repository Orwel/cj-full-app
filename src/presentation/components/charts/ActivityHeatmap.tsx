'use client'

import type { HeatmapCell } from '@/lib/analytics/actuaciones-heatmap'
import { Card } from '@/presentation/components/ui/Card'

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function ActivityHeatmap({ data }: { data: HeatmapCell[] }) {
  const weeks = [...new Set(data.map((c) => c.week))].sort((a, b) => a - b)
  const max = Math.max(1, ...data.map((c) => c.count))

  function getCount(week: number, dow: number) {
    return data.find((c) => c.week === week && c.dayOfWeek === dow)?.count ?? 0
  }

  function intensity(count: number) {
    if (count === 0) return 'bg-slate-100'
    const t = count / max
    if (t > 0.75) return 'bg-brand-700'
    if (t > 0.5) return 'bg-brand-600'
    if (t > 0.25) return 'bg-brand-100'
    return 'bg-brand-50'
  }

  return (
    <Card variant="default">
      <h3 className="mb-4 text-sm font-bold text-app-text">
        Actividad judicial (últimas semanas)
      </h3>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th />
              {weeks.map((w) => (
                <th key={w} className="px-1 text-center font-normal text-app-muted-text">
                  S{w + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_ORDER.map((dow, rowIdx) => (
              <tr key={dow}>
                <td className="pr-2 text-app-secondary">{DAY_LABELS[rowIdx]}</td>
                {weeks.map((w) => {
                  const count = getCount(w, dow)
                  return (
                    <td key={`${w}-${dow}`} className="p-0">
                      <div
                        title={`${count} actuaciones`}
                        className={`mx-auto h-6 w-8 rounded ${intensity(count)}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
