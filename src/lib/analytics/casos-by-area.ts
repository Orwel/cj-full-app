import { createClient } from '@/lib/supabase/server'
import type { Area } from '@/domain/entities/caso'
import { areaLabels } from '@/lib/labels'

export type CasoAreaDatum = {
  area: Area
  label: string
  count: number
}

export async function getCasosByArea(): Promise<CasoAreaDatum[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('casos').select('area')

  if (error || !data) return []

  const counts = new Map<Area, number>()
  for (const row of data) {
    const area = row.area as Area
    counts.set(area, (counts.get(area) ?? 0) + 1)
  }

  return (Object.keys(areaLabels) as Area[]).map((area) => ({
    area,
    label: areaLabels[area],
    count: counts.get(area) ?? 0,
  }))
}
