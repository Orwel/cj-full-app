import type { SupabaseClient } from '@supabase/supabase-js'
import { sendPendingTelegramAlerts } from '@/infrastructure/notifications/telegram'
import type { TelegramSyncInfo } from '@/lib/telegram/sync-hints'

export type TelegramDispatchResult = TelegramSyncInfo

function supabaseFunctionsBase(): string | null {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    ''
  ).replace(/\/$/, '')
  return url || null
}

async function dispatchViaEdge(casoId?: string): Promise<TelegramDispatchResult> {
  const base = supabaseFunctionsBase()
  const cronSecret = process.env.CRON_SECRET
  if (!base || !cronSecret) {
    return {
      sent: 0,
      skipped: 0,
      channel: 'none',
      hint:
        'Añade TELEGRAM_BOT_TOKEN en .env.local o CRON_SECRET + NEXT_PUBLIC_SUPABASE_URL para enviar alertas por Telegram.',
    }
  }

  const res = await fetch(`${base}/functions/v1/telegram-send-pending`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(casoId ? { casoId } : {}),
  })

  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    sent?: number
    skipped?: number
    error?: string
  }

  if (!res.ok || !payload.ok) {
    throw new Error(
      payload.error ??
        `telegram-send-pending respondió ${res.status}. Despliega la función y revisa CRON_SECRET.`,
    )
  }

  return {
    sent: payload.sent ?? 0,
    skipped: payload.skipped ?? 0,
    messages: (payload as { messages?: number }).messages ?? 0,
    channel: 'edge',
  }
}

/**
 * Envía alertas pendientes tras sync manual (agrupadas por caso).
 * Usa token local si existe; si no, Edge Function (mismos secrets que el webhook).
 */
export async function dispatchPendingTelegramAlerts(
  admin: SupabaseClient,
  options?: { casoId?: string },
): Promise<TelegramDispatchResult> {
  const casoId = options?.casoId
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_PUBLIC_URL

  if (botToken) {
    try {
      const { sent, skipped, messages } = await sendPendingTelegramAlerts(admin, {
        botToken,
        appBaseUrl,
        casoId,
      })
      return { sent, skipped, messages, channel: 'local' }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error Telegram local'
      console.error('[telegram] dispatch local:', msg)
      // Intentar Edge como respaldo
      try {
        const edge = await dispatchViaEdge(casoId)
        return { ...edge, hint: `Respaldo Edge tras fallo local: ${msg}` }
      } catch (edgeErr) {
        const edgeMsg =
          edgeErr instanceof Error ? edgeErr.message : 'Error Telegram Edge'
        throw new Error(`${msg}. ${edgeMsg}`)
      }
    }
  }

  try {
    return await dispatchViaEdge(casoId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error Telegram'
    console.error('[telegram] dispatch edge:', msg)
    return {
      sent: 0,
      skipped: 0,
      channel: 'none',
      hint: msg,
    }
  }
}
