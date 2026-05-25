import { assertCronAuth, createServiceAdmin } from '../_shared/cron-auth.ts'
import {
  escapeHtml,
  getAppUrl,
  sendTelegramToProfile,
  type TelegramDestinatario,
} from '../_shared/telegram.ts'

const DIGEST_BATCH = 40
const DAY_MS = 24 * 3_600_000

type ProfileRow = {
  id: string
  full_name: string
  role: string
  telegram_chat_id: number
}

type CasoRow = {
  id: string
  numero_caso: string
  radicado_judicial: string
  estado_critico: boolean
  fecha_ultima_actuacion_remota: string | null
  fecha_ultimo_scraping: string | null
}

type AlertaDigest = {
  id: string
  titulo: string
  tipo_alerta: string
  leida: boolean
  created_at: string
}

type ActuacionDigest = {
  actuacion: string
  fecha_actuacion: string
  es_nueva: boolean
  scraped_at: string
}

type CasoInforme = {
  caso: CasoRow
  nuevasActuaciones24h: number
  ultimaActuacion: ActuacionDigest | null
  alertas24h: AlertaDigest[]
  ultimoSyncStatus: string | null
}

function severityEmoji(tipo: string): string {
  switch (tipo) {
    case 'critica':
      return '🔴'
    case 'urgente':
      return '🟠'
    case 'atencion':
      return '🟡'
    default:
      return 'ℹ️'
  }
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function syncStatusLabel(status: string | null): string {
  switch (status) {
    case 'success':
      return 'Sincronizado OK'
    case 'no_changes':
      return 'Sin cambios en Rama'
    case 'error':
      return 'Error de sync'
    case 'not_found':
      return 'Proceso no encontrado'
    case 'invalid_format':
      return 'Radicado inválido'
    default:
      return status ? escapeHtml(status) : 'Sin registro de sync'
  }
}

function buildDigestHtml(
  fullName: string,
  informes: CasoInforme[],
  appUrl: string,
): string {
  const fecha = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const lines: string[] = [
    `<b>Informe diario — Consultorio</b>`,
    `${escapeHtml(fullName)} · ${escapeHtml(fecha)}`,
    '',
  ]

  if (informes.length === 0) {
    lines.push('No tienes procesos activos en monitoreo.')
  }

  for (const inf of informes) {
    const { caso } = inf
    const critico = caso.estado_critico ? ' · <b>Estado crítico</b>' : ''
    lines.push(
      `<b>${escapeHtml(caso.numero_caso)}</b>${critico}`,
      `Radicado: <code>${escapeHtml(caso.radicado_judicial)}</code>`,
      `Última actuación (Rama): ${formatFecha(caso.fecha_ultima_actuacion_remota)}`,
      `Último sync: ${syncStatusLabel(inf.ultimoSyncStatus)} (${formatFecha(caso.fecha_ultimo_scraping)})`,
    )

    if (inf.nuevasActuaciones24h > 0) {
      lines.push(`<b>+${inf.nuevasActuaciones24h} actuación(es) nueva(s) en 24 h</b>`)
      if (inf.ultimaActuacion) {
        const u = inf.ultimaActuacion
        const resumen =
          u.actuacion.length > 80 ? `${u.actuacion.slice(0, 77)}…` : u.actuacion
        lines.push(
          `↳ ${formatFecha(u.fecha_actuacion)}: ${escapeHtml(resumen)}`,
        )
      }
    } else {
      lines.push('Sin actuaciones nuevas en las últimas 24 h.')
    }

    if (inf.alertas24h.length > 0) {
      lines.push(`Alertas (24 h): ${inf.alertas24h.length}`)
      for (const a of inf.alertas24h.slice(0, 4)) {
        const unread =
          !a.leida && (a.tipo_alerta === 'critica' || a.tipo_alerta === 'urgente')
            ? ' (sin leer)'
            : ''
        lines.push(
          `${severityEmoji(a.tipo_alerta)} ${escapeHtml(a.titulo)}${unread}`,
        )
      }
      if (inf.alertas24h.length > 4) {
        lines.push(`… y ${inf.alertas24h.length - 4} más`)
      }
    } else {
      lines.push('Alertas (24 h): ninguna nueva.')
    }

    if (appUrl) {
      lines.push(`<a href="${appUrl}/dashboard/casos/${caso.id}">Ver caso</a>`)
    }
    lines.push('')
  }

  if (appUrl) {
    lines.push(`<a href="${appUrl}/dashboard/alertas">Panel de alertas</a>`)
  }

  return lines.join('\n').slice(0, 4000)
}

async function getCasoIdsForProfile(
  admin: ReturnType<typeof createServiceAdmin>,
  profile: ProfileRow,
): Promise<string[]> {
  if (profile.role === 'student') {
    const { data, error } = await admin
      .from('casos')
      .select('id')
      .eq('student_id', profile.id)
      .eq('scraping_activo', true)
    if (error) throw new Error(error.message)
    return (data ?? []).map((c) => c.id)
  }

  const { data: subs, error: se } = await admin
    .from('caso_suscriptores')
    .select('caso_id')
    .eq('profile_id', profile.id)

  if (se) throw new Error(se.message)
  return (subs ?? []).map((s) => s.caso_id)
}

async function buildCasoInforme(
  admin: ReturnType<typeof createServiceAdmin>,
  casoId: string,
  dayAgo: string,
): Promise<CasoInforme | null> {
  const { data: caso, error: ce } = await admin
    .from('casos')
    .select(
      'id, numero_caso, radicado_judicial, estado_critico, fecha_ultima_actuacion_remota, fecha_ultimo_scraping',
    )
    .eq('id', casoId)
    .maybeSingle()

  if (ce) throw new Error(ce.message)
  if (!caso) return null

  const { count: nuevasCount, error: acErr } = await admin
    .from('actuaciones')
    .select('id', { count: 'exact', head: true })
    .eq('caso_id', casoId)
    .gte('scraped_at', dayAgo)

  if (acErr) throw new Error(acErr.message)

  const { data: ultAct, error: uaErr } = await admin
    .from('actuaciones')
    .select('actuacion, fecha_actuacion, es_nueva, scraped_at')
    .eq('caso_id', casoId)
    .order('fecha_actuacion', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (uaErr) throw new Error(uaErr.message)

  const { data: alertas, error: alErr } = await admin
    .from('alertas')
    .select('id, titulo, tipo_alerta, leida, created_at')
    .eq('caso_id', casoId)
    .gte('created_at', dayAgo)
    .order('created_at', { ascending: false })
    .limit(20)

  if (alErr) throw new Error(alErr.message)

  const { data: lastLog, error: logErr } = await admin
    .from('scraping_logs')
    .select('status')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (logErr) throw new Error(logErr.message)

  return {
    caso: caso as CasoRow,
    nuevasActuaciones24h: nuevasCount ?? 0,
    ultimaActuacion: (ultAct as ActuacionDigest | null) ?? null,
    alertas24h: (alertas ?? []) as AlertaDigest[],
    ultimoSyncStatus: lastLog?.status ?? null,
  }
}

async function buildInformesForProfile(
  admin: ReturnType<typeof createServiceAdmin>,
  casoIds: string[],
): Promise<CasoInforme[]> {
  const dayAgo = new Date(Date.now() - DAY_MS).toISOString()
  const informes: CasoInforme[] = []

  for (const casoId of casoIds) {
    const inf = await buildCasoInforme(admin, casoId, dayAgo)
    if (inf) informes.push(inf)
  }

  informes.sort((a, b) => a.caso.numero_caso.localeCompare(b.caso.numero_caso))
  return informes
}

Deno.serve(async (req) => {
  const denied = assertCronAuth(req)
  if (denied) return denied

  try {
    const admin = createServiceAdmin()
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!token) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, reason: 'TELEGRAM_BOT_TOKEN not set' }),
        { headers: { 'content-type': 'application/json' } },
      )
    }

    const appUrl = getAppUrl()

    const { data: profiles, error: pe } = await admin
      .from('profiles')
      .select('id, full_name, role, telegram_chat_id')
      .not('telegram_chat_id', 'is', null)
      .is('telegram_blocked_at', null)
      .limit(DIGEST_BATCH)

    if (pe) throw new Error(pe.message)

    let sent = 0
    let skipped = 0

    for (const p of (profiles ?? []) as ProfileRow[]) {
      const casoIds = await getCasoIdsForProfile(admin, p)
      if (casoIds.length === 0) {
        skipped++
        continue
      }

      const informes = await buildInformesForProfile(admin, casoIds)
      const html = buildDigestHtml(p.full_name, informes, appUrl)

      const dest: TelegramDestinatario = {
        profileId: p.id,
        chatId: p.telegram_chat_id,
        fullName: p.full_name,
      }

      const ok = await sendTelegramToProfile(admin, token, dest, html)
      if (ok) {
        await admin
          .from('profiles')
          .update({ last_telegram_digest_at: new Date().toISOString() })
          .eq('id', p.id)
        sent++
      } else {
        skipped++
      }
      await new Promise((r) => setTimeout(r, 100))
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent,
        skipped,
        processed: (profiles ?? []).length,
      }),
      { headers: { 'content-type': 'application/json' } },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
})
