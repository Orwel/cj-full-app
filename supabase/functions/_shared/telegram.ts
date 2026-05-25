import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const TG_API = (token: string) => `https://api.telegram.org/bot${token}`

const TELEGRAM_IMMEDIATE_TYPES = ['critica', 'urgente', 'atencion', 'informativa']
const MAX_LINES_IN_GROUPED_MESSAGE = 8
const MAX_PENDING_ALERTAS_FETCH = 100

export type TelegramDestinatario = {
  profileId: string
  chatId: number
  fullName: string
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
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

function severityRank(tipo: string): number {
  switch (tipo) {
    case 'critica':
      return 0
    case 'urgente':
      return 1
    case 'atencion':
      return 2
    default:
      return 3
  }
}

function getBotToken(): string | null {
  return Deno.env.get('TELEGRAM_BOT_TOKEN') ?? null
}

export function getAppUrl(): string {
  return (Deno.env.get('APP_PUBLIC_URL') ?? '').replace(/\/$/, '')
}

type SendResult = { ok: boolean; blocked?: boolean }

export async function sendTelegram(
  token: string,
  chatId: number,
  html: string,
): Promise<SendResult> {
  const res = await fetch(`${TG_API(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: html.slice(0, 4096),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })
  if (res.ok) return { ok: true }
  const body = await res.text()
  const blocked = res.status === 403 || body.includes('blocked') || body.includes('Forbidden')
  return { ok: false, blocked }
}

async function markProfileBlocked(
  admin: SupabaseClient,
  profileId: string,
): Promise<void> {
  await admin
    .from('profiles')
    .update({
      telegram_blocked_at: new Date().toISOString(),
      telegram_chat_id: null,
      telegram_username: null,
    })
    .eq('id', profileId)
}

export async function sendTelegramToProfile(
  admin: SupabaseClient,
  token: string,
  dest: TelegramDestinatario,
  html: string,
): Promise<boolean> {
  const result = await sendTelegram(token, dest.chatId, html)
  if (result.ok) return true
  if (result.blocked) await markProfileBlocked(admin, dest.profileId)
  return false
}

export function buildAlertaMessage(
  titulo: string,
  mensaje: string,
  numeroCaso: string,
  radicado: string,
  tipoAlerta: string,
  appUrl: string,
): string {
  const link = appUrl ? `\n<a href="${appUrl}/dashboard/alertas">Ver alertas</a>` : ''
  return (
    `${severityEmoji(tipoAlerta)} <b>[${escapeHtml(tipoAlerta.toUpperCase())}] ${escapeHtml(titulo)}</b>\n` +
    `Caso: <b>${escapeHtml(numeroCaso)}</b>\n` +
    `Radicado: <code>${escapeHtml(radicado)}</code>\n\n` +
    `${escapeHtml(mensaje)}${link}`
  )
}

type AlertaRow = {
  id: string
  titulo: string
  mensaje: string
  tipo_alerta: string
  caso_id: string
  casos: {
    id: string
    numero_caso: string
    radicado_judicial: string
    student_id: string | null
  } | null
}

type CasoGrupo = {
  casoId: string
  numeroCaso: string
  radicado: string
  studentId: string | null
  alertas: AlertaRow[]
}

function groupAlertasByCaso(rows: AlertaRow[]): CasoGrupo[] {
  const map = new Map<string, CasoGrupo>()
  for (const row of rows) {
    const caso = row.casos
    if (!caso) continue
    let grupo = map.get(caso.id)
    if (!grupo) {
      grupo = {
        casoId: caso.id,
        numeroCaso: caso.numero_caso,
        radicado: caso.radicado_judicial,
        studentId: caso.student_id,
        alertas: [],
      }
      map.set(caso.id, grupo)
    }
    grupo.alertas.push(row)
  }
  for (const grupo of map.values()) {
    grupo.alertas.sort(
      (a, b) =>
        severityRank(a.tipo_alerta) - severityRank(b.tipo_alerta) ||
        a.titulo.localeCompare(b.titulo),
    )
  }
  return [...map.values()]
}

function buildGroupedCasoMessage(grupo: CasoGrupo, appUrl: string): string {
  const n = grupo.alertas.length
  const lines: string[] = [
    `<b>Consultorio — ${n} alerta${n === 1 ? '' : 's'}</b>`,
    `Caso: <b>${escapeHtml(grupo.numeroCaso)}</b>`,
    `Radicado: <code>${escapeHtml(grupo.radicado)}</code>`,
    '',
  ]
  for (const a of grupo.alertas.slice(0, MAX_LINES_IN_GROUPED_MESSAGE)) {
    const resumen =
      a.mensaje.length > 120 ? `${a.mensaje.slice(0, 117).trim()}…` : a.mensaje
    lines.push(
      `${severityEmoji(a.tipo_alerta)} <b>${escapeHtml(a.titulo)}</b>\n${escapeHtml(resumen)}`,
    )
  }
  if (n > MAX_LINES_IN_GROUPED_MESSAGE) {
    lines.push('', `… y ${n - MAX_LINES_IN_GROUPED_MESSAGE} alerta(s) más en el panel.`)
  }
  if (appUrl) {
    lines.push(
      '',
      `<a href="${appUrl}/dashboard/casos/${grupo.casoId}">Ver caso</a> · ` +
        `<a href="${appUrl}/dashboard/alertas">Todas las alertas</a>`,
    )
  }
  return lines.join('\n').slice(0, 4096)
}

/** Destinatarios: estudiante del caso + suscriptores con Telegram activo. */
export async function resolveCasoDestinatarios(
  admin: SupabaseClient,
  casoId: string,
  studentId: string | null,
): Promise<TelegramDestinatario[]> {
  const profileIds = new Set<string>()
  if (studentId) profileIds.add(studentId)

  const { data: subs, error: se } = await admin
    .from('caso_suscriptores')
    .select('profile_id')
    .eq('caso_id', casoId)

  if (se) throw new Error(se.message)
  for (const s of subs ?? []) profileIds.add(s.profile_id)

  if (profileIds.size === 0) return []

  const { data: profiles, error: pe } = await admin
    .from('profiles')
    .select('id, full_name, telegram_chat_id, telegram_blocked_at')
    .in('id', [...profileIds])
    .not('telegram_chat_id', 'is', null)
    .is('telegram_blocked_at', null)

  if (pe) throw new Error(pe.message)

  const byChat = new Map<number, TelegramDestinatario>()
  for (const p of profiles ?? []) {
    if (p.telegram_chat_id == null) continue
    byChat.set(p.telegram_chat_id, {
      profileId: p.id,
      chatId: p.telegram_chat_id,
      fullName: p.full_name,
    })
  }
  return [...byChat.values()]
}

/** Alertas pendientes de Telegram, agrupadas en un mensaje por caso. */
export async function sendPendingTelegramAlerts(
  admin: SupabaseClient,
  options?: { casoId?: string },
): Promise<{ sent: number; skipped: number; messages: number }> {
  const token = getBotToken()
  if (!token) return { sent: 0, skipped: 0, messages: 0 }

  const appUrl = getAppUrl()

  let query = admin
    .from('alertas')
    .select(
      `id, titulo, mensaje, tipo_alerta, caso_id,
       casos ( id, numero_caso, radicado_judicial, student_id )`,
    )
    .is('telegram_sent_at', null)
    .in('tipo_alerta', TELEGRAM_IMMEDIATE_TYPES)
    .limit(MAX_PENDING_ALERTAS_FETCH)

  if (options?.casoId) {
    query = query.eq('caso_id', options.casoId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const grupos = groupAlertasByCaso((data ?? []) as AlertaRow[])
  let sent = 0
  let skipped = 0
  let messages = 0

  for (const grupo of grupos) {
    const destinatarios = await resolveCasoDestinatarios(
      admin,
      grupo.casoId,
      grupo.studentId,
    )
    if (destinatarios.length === 0) {
      skipped += grupo.alertas.length
      continue
    }

    const html = buildGroupedCasoMessage(grupo, appUrl)
    let anyOk = false
    for (const dest of destinatarios) {
      const ok = await sendTelegramToProfile(admin, token, dest, html)
      if (ok) anyOk = true
      await new Promise((r) => setTimeout(r, 50))
    }

    if (!anyOk) {
      skipped += grupo.alertas.length
      continue
    }

    messages++
    const ids = grupo.alertas.map((a) => a.id)
    await admin
      .from('alertas')
      .update({ telegram_sent_at: new Date().toISOString() })
      .in('id', ids)
    sent += ids.length
  }

  return { sent, skipped, messages }
}

export async function resolveAdminTelegramDestinatarios(
  admin: SupabaseClient,
): Promise<TelegramDestinatario[]> {
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, telegram_chat_id, telegram_blocked_at')
    .eq('role', 'admin')
    .not('telegram_chat_id', 'is', null)
    .is('telegram_blocked_at', null)

  if (error) throw new Error(error.message)

  return (data ?? [])
    .filter((p) => p.telegram_chat_id != null)
    .map((p) => ({
      profileId: p.id,
      chatId: p.telegram_chat_id as number,
      fullName: p.full_name,
    }))
}

export async function sendAdminTelegram(
  admin: SupabaseClient,
  html: string,
): Promise<number> {
  const token = getBotToken()
  if (!token) return 0

  const destinatarios = await resolveAdminTelegramDestinatarios(admin)
  if (destinatarios.length === 0) return 0

  let count = 0
  for (const dest of destinatarios) {
    const ok = await sendTelegramToProfile(admin, token, dest, html)
    if (ok) count++
    await new Promise((r) => setTimeout(r, 50))
  }
  return count
}
