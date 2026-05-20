import { createClient } from '@/lib/supabase/server'

const STALE_HOURS = 48
const UNREAD_CRITICAL_HOURS = 24

export type StaleCasoRow = {
  id: string
  numero_caso: string
  radicado_judicial: string
  despacho: string | null
  fecha_ultimo_scraping: string | null
}

export type UnreadCriticaRow = {
  id: string
  titulo: string
  created_at: string
  numero_caso: string
  radicado_judicial: string
}

export type SyncQueueSummary = {
  pending: number
  running: number
  done: number
  failed: number
}

export type ScrapingLogRow = {
  id: string
  caso_id: string | null
  radicado: string
  status: string
  actuaciones_nuevas: number | null
  error_message: string | null
  created_at: string
  numero_caso?: string
}

export type OperationalHealth = {
  staleHours: number
  unreadCriticalHours: number
  casosActivos: number
  staleCasos: StaleCasoRow[]
  unreadCriticas: UnreadCriticaRow[]
  syncQueueHoy: SyncQueueSummary
  recentLogs: ScrapingLogRow[]
  alertasPendientes: number
  casosEstadoCritico: number
}

export async function getOperationalHealth(): Promise<OperationalHealth> {
  const supabase = await createClient()
  const staleCutoff = new Date(Date.now() - STALE_HOURS * 3_600_000).toISOString()
  const unreadCutoff = new Date(Date.now() - UNREAD_CRITICAL_HOURS * 3_600_000).toISOString()

  const [
    { data: casosActivos },
    { data: unreadRows },
    { data: queueRows },
    { data: logs },
    { count: alertasPendientes },
    { count: casosEstadoCritico },
  ] = await Promise.all([
    supabase
      .from('casos')
      .select('id, numero_caso, radicado_judicial, despacho, fecha_ultimo_scraping')
      .eq('scraping_activo', true),
    supabase
      .from('alertas')
      .select(
        `id, titulo, created_at, casos ( numero_caso, radicado_judicial )`,
      )
      .eq('tipo_alerta', 'critica')
      .eq('leida', false)
      .lt('created_at', unreadCutoff)
      .order('created_at', { ascending: true })
      .limit(50),
    supabase
      .from('sync_queue')
      .select('status')
      .eq('scheduled_date', new Date().toISOString().slice(0, 10)),
    supabase
      .from('scraping_logs')
      .select('id, caso_id, radicado, status, actuaciones_nuevas, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('alertas')
      .select('id', { count: 'exact', head: true })
      .eq('leida', false)
      .neq('tipo_alerta', 'informativa'),
    supabase
      .from('casos')
      .select('id', { count: 'exact', head: true })
      .eq('estado_critico', true),
  ])

  const staleCasos: StaleCasoRow[] = []
  for (const c of casosActivos ?? []) {
    const { data: recentOk } = await supabase
      .from('scraping_logs')
      .select('id')
      .eq('caso_id', c.id)
      .in('status', ['success', 'no_changes'])
      .gte('created_at', staleCutoff)
      .limit(1)
    if (!recentOk?.length) {
      staleCasos.push(c as StaleCasoRow)
    }
  }

  const unreadCriticas: UnreadCriticaRow[] = (unreadRows ?? []).map((r) => {
    const raw = r.casos as
      | { numero_caso: string; radicado_judicial: string }
      | { numero_caso: string; radicado_judicial: string }[]
      | null
    const caso = Array.isArray(raw) ? raw[0] : raw
    return {
      id: r.id,
      titulo: r.titulo,
      created_at: r.created_at,
      numero_caso: caso?.numero_caso ?? '—',
      radicado_judicial: caso?.radicado_judicial ?? '—',
    }
  })

  const syncQueueHoy: SyncQueueSummary = {
    pending: 0,
    running: 0,
    done: 0,
    failed: 0,
  }
  for (const row of queueRows ?? []) {
    const s = row.status as keyof SyncQueueSummary
    if (s in syncQueueHoy) syncQueueHoy[s]++
  }

  const casoIds = [...new Set((logs ?? []).map((l) => l.caso_id).filter(Boolean))] as string[]
  let numeroByCaso: Record<string, string> = {}
  if (casoIds.length > 0) {
    const { data: casos } = await supabase
      .from('casos')
      .select('id, numero_caso')
      .in('id', casoIds)
    numeroByCaso = Object.fromEntries((casos ?? []).map((c) => [c.id, c.numero_caso]))
  }

  const recentLogs: ScrapingLogRow[] = (logs ?? []).map((l) => ({
    ...l,
    numero_caso: l.caso_id ? numeroByCaso[l.caso_id] : undefined,
  }))

  return {
    staleHours: STALE_HOURS,
    unreadCriticalHours: UNREAD_CRITICAL_HOURS,
    casosActivos: casosActivos?.length ?? 0,
    staleCasos,
    unreadCriticas,
    syncQueueHoy,
    recentLogs,
    alertasPendientes: alertasPendientes ?? 0,
    casosEstadoCritico: casosEstadoCritico ?? 0,
  }
}
