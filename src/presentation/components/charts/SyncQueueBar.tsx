'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SyncQueueSummary } from '@/lib/operations/health-summary'
import { CHART_COLORS } from './chart-theme'
import { Card } from '@/presentation/components/ui/Card'

export function SyncQueueBar({ queue }: { queue: SyncQueueSummary }) {
  const data = [
    { name: 'Pending', value: queue.pending, fill: CHART_COLORS.urgente },
    { name: 'Running', value: queue.running, fill: CHART_COLORS.brandLight },
    { name: 'Done', value: queue.done, fill: CHART_COLORS.brand },
    { name: 'Failed', value: queue.failed, fill: CHART_COLORS.critica },
  ]

  return (
    <Card variant="default" className="h-[280px]">
      <h3 className="mb-4 text-sm font-semibold text-app-text">
        Cola de sincronización (hoy)
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
          <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}
