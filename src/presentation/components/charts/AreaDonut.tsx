'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CasoAreaDatum } from '@/lib/analytics/casos-by-area'
import { AREA_CHART_COLORS } from './chart-theme'
import { Card } from '@/presentation/components/ui/Card'

export function AreaDonut({ data }: { data: CasoAreaDatum[] }) {
  const filtered = data.filter((d) => d.count > 0)
  const empty = filtered.length === 0

  return (
    <Card variant="default" className="h-[320px]">
      <h3 className="mb-4 text-sm font-bold text-app-text">Casos por área</h3>
      {empty ? (
        <p className="flex h-[260px] items-center justify-center text-sm text-app-muted-text">
          Sin casos registrados
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={filtered}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {filtered.map((_, i) => (
                <Cell
                  key={i}
                  fill={AREA_CHART_COLORS[i % AREA_CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
