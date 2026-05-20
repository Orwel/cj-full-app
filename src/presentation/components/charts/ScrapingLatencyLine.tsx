'use client'

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ScrapingLatencyPoint } from '@/lib/analytics/scraping-stats'
import { CHART_COLORS } from './chart-theme'
import { Card } from '@/presentation/components/ui/Card'
import { formatFechaCo } from '@/lib/labels'

export function ScrapingLatencyLine({ data }: { data: ScrapingLatencyPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatFechaCo(d.date),
  }))

  return (
    <Card variant="default" className="h-[280px]">
      <h3 className="mb-4 text-sm font-semibold text-app-text">
        Latencia media scraping (7 días)
      </h3>
      {chartData.length === 0 ? (
        <p className="flex h-[220px] items-center justify-center text-sm text-app-muted-text">
          Sin datos de duración
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
            <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} unit=" ms" />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
              }}
            />
            <Line
              type="monotone"
              dataKey="avgMs"
              stroke={CHART_COLORS.brand}
              strokeWidth={2}
              dot={{ fill: CHART_COLORS.brand, r: 3 }}
              name="ms promedio"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
