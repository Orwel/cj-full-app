import { createClient } from '@/lib/supabase/server'

export type ScrapingStatusCount = {
  status: string
  count: number
}

export type ScrapingLatencyPoint = {
  date: string
  avgMs: number
}

export type ScrapingStats = {
  byStatus: ScrapingStatusCount[]
  latencyByDay: ScrapingLatencyPoint[]
}

export async function getScrapingStats(days = 7): Promise<ScrapingStats> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('scraping_logs')
    .select('status, duration_ms, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error || !data) {
    return { byStatus: [], latencyByDay: [] }
  }

  const statusCounts = new Map<string, number>()
  const latencyByDay = new Map<string, { sum: number; n: number }>()

  for (const row of data) {
    const status = row.status as string
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)

    const ms = row.duration_ms as number | null
    if (ms != null && ms > 0) {
      const key = (row.created_at as string).slice(0, 10)
      const cur = latencyByDay.get(key) ?? { sum: 0, n: 0 }
      cur.sum += ms
      cur.n += 1
      latencyByDay.set(key, cur)
    }
  }

  return {
    byStatus: Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
    })),
    latencyByDay: Array.from(latencyByDay.entries())
      .map(([date, { sum, n }]) => ({
        date,
        avgMs: Math.round(sum / n),
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  }
}
