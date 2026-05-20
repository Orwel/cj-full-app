import { createClient } from '@/lib/supabase/server'

export type AlertaDayRow = {
  date: string
  critica: number
  urgente: number
  atencion: number
  informativa: number
  total: number
}

const SEVERITIES = ['critica', 'urgente', 'atencion', 'informativa'] as const

export async function getAlertasByDay(days = 30): Promise<AlertaDayRow[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('alertas')
    .select('created_at, tipo_alerta')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true })

  if (error || !data) return []

  const byDay = new Map<string, AlertaDayRow>()

  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const key = d.toISOString().slice(0, 10)
    byDay.set(key, {
      date: key,
      critica: 0,
      urgente: 0,
      atencion: 0,
      informativa: 0,
      total: 0,
    })
  }

  for (const row of data) {
    const key = (row.created_at as string).slice(0, 10)
    let entry = byDay.get(key)
    if (!entry) {
      entry = {
        date: key,
        critica: 0,
        urgente: 0,
        atencion: 0,
        informativa: 0,
        total: 0,
      }
      byDay.set(key, entry)
    }
    const tipo = row.tipo_alerta as (typeof SEVERITIES)[number]
    if (SEVERITIES.includes(tipo)) {
      entry[tipo] += 1
      entry.total += 1
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date))
}
