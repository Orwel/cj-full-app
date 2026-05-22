'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AlertaDayRow } from '@/lib/analytics/alertas-by-day'
import { CHART_COLORS } from './chart-theme'
import { Card } from '@/presentation/components/ui/Card'
import { formatFechaCo } from '@/lib/labels'

export function SeverityAreaChart({ data }: { data: AlertaDayRow[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatFechaCo(d.date),
  }))

  return (
    <Card variant="default" className="min-h-[280px] sm:h-[320px]">
      <h3 className="mb-4 text-sm font-bold text-app-text">
        Alertas por severidad (30 días)
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} />
          <YAxis tick={{ fill: CHART_COLORS.axis, fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              color: '#0f172a',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: CHART_COLORS.axis }} />
          <Area
            type="monotone"
            dataKey="critica"
            stackId="1"
            stroke={CHART_COLORS.critica}
            fill={CHART_COLORS.critica}
            fillOpacity={0.35}
            name="Crítica"
          />
          <Area
            type="monotone"
            dataKey="urgente"
            stackId="1"
            stroke={CHART_COLORS.urgente}
            fill={CHART_COLORS.urgente}
            fillOpacity={0.35}
            name="Urgente"
          />
          <Area
            type="monotone"
            dataKey="atencion"
            stackId="1"
            stroke={CHART_COLORS.atencion}
            fill={CHART_COLORS.atencion}
            fillOpacity={0.3}
            name="Atención"
          />
          <Area
            type="monotone"
            dataKey="informativa"
            stackId="1"
            stroke={CHART_COLORS.informativa}
            fill={CHART_COLORS.informativa}
            fillOpacity={0.25}
            name="Informativa"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
