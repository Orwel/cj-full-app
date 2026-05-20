import { createClient } from '@/lib/supabase/server'

export type HeatmapCell = {
  week: number
  dayOfWeek: number
  dayLabel: string
  count: number
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export async function getActuacionesHeatmap(weeks = 8): Promise<HeatmapCell[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - weeks * 7)

  const { data, error } = await supabase
    .from('actuaciones')
    .select('fecha_actuacion')
    .gte('fecha_actuacion', since.toISOString().slice(0, 10))

  if (error || !data) return []

  const counts = new Map<string, number>()
  for (const row of data) {
    const fecha = row.fecha_actuacion as string
    const d = new Date(`${fecha}T12:00:00`)
    const weekStart = startOfWeek(d)
    const weekNum = Math.floor(
      (weekStart.getTime() - startOfWeek(since).getTime()) / (7 * 86_400_000),
    )
    const dow = d.getDay()
    const key = `${weekNum}-${dow}`
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const cells: HeatmapCell[] = []
  for (let w = 0; w < weeks; w++) {
    for (let dow = 0; dow < 7; dow++) {
      cells.push({
        week: w,
        dayOfWeek: dow,
        dayLabel: DAY_LABELS[dow],
        count: counts.get(`${w}-${dow}`) ?? 0,
      })
    }
  }
  return cells
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}
