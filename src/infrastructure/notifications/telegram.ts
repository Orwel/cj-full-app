import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildGroupedCasoMessage,
  groupAlertasByCaso,
  MAX_PENDING_ALERTAS_FETCH,
  TELEGRAM_IMMEDIATE_TYPES,
  type AlertaPendiente,
} from '@/lib/telegram/pending-alerts-core'

const TG_API = (token: string) => `https://api.telegram.org/bot${token}`

export type TelegramDestinatario = {
  profileId: string
  chatId: number
  fullName: string
}

async function sendTelegram(
  token: string,
  chatId: number,
  html: string,
): Promise<{ ok: boolean; blocked?: boolean }> {
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
  const blocked =
    res.status === 403 || body.includes('blocked') || body.includes('Forbidden')
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

async function resolveCasoDestinatarios(
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
  options: { botToken: string; appBaseUrl?: string; casoId?: string },
): Promise<{ sent: number; skipped: number; messages: number }> {
  const { botToken, appBaseUrl, casoId } = options
  const appUrl = appBaseUrl?.replace(/\/$/, '') ?? ''

  let query = admin
    .from('alertas')
    .select(
      `id, titulo, mensaje, tipo_alerta, caso_id,
       casos ( id, numero_caso, radicado_judicial, student_id )`,
    )
    .is('telegram_sent_at', null)
    .in('tipo_alerta', [...TELEGRAM_IMMEDIATE_TYPES])
    .limit(MAX_PENDING_ALERTAS_FETCH)

  if (casoId) {
    query = query.eq('caso_id', casoId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as AlertaPendiente[]
  const grupos = groupAlertasByCaso(rows)

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
      const result = await sendTelegram(botToken, dest.chatId, html)
      if (result.ok) {
        anyOk = true
      } else if (result.blocked) {
        await markProfileBlocked(admin, dest.profileId)
      }
      await new Promise((r) => setTimeout(r, 50))
    }

    if (!anyOk) {
      skipped += grupo.alertas.length
      continue
    }

    messages++
    const ids = grupo.alertas.map((a) => a.id)
    const { error: ue } = await admin
      .from('alertas')
      .update({ telegram_sent_at: new Date().toISOString() })
      .in('id', ids)

    if (ue) throw new Error(ue.message)
    sent += ids.length
  }

  return { sent, skipped, messages }
}
