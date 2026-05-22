import { createServiceAdmin } from '../_shared/cron-auth.ts'
import { getAppUrl } from '../_shared/telegram.ts'

const LINK_CODE_TTL_MS = 30 * 60 * 1000

function assertWebhookToken(req: Request): Response | null {
  const expected = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
  if (!expected) {
    return new Response('Webhook not configured', { status: 503 })
  }
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (token !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }
  return null
}

async function replyTelegram(chatId: number, text: string): Promise<void> {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) return
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

type TelegramUpdate = {
  message?: {
    chat: { id: number }
    from?: { username?: string }
    text?: string
  }
}

Deno.serve(async (req) => {
  const denied = assertWebhookToken(req)
  if (denied) return denied

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const update = (await req.json()) as TelegramUpdate
    const message = update.message
    if (!message?.text || !message.chat?.id) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
      })
    }

    const chatId = message.chat.id
    const username = message.from?.username ?? null
    const text = message.text.trim()
    const admin = createServiceAdmin()
    const appUrl = getAppUrl()

    if (text === '/desvincular' || text.startsWith('/desvincular@')) {
      const { data: linked } = await admin
        .from('profiles')
        .select('id, full_name')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()

      if (!linked) {
        await replyTelegram(
          chatId,
          'No hay ninguna cuenta del Consultorio vinculada a este chat.',
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
        })
      }

      await admin
        .from('profiles')
        .update({
          telegram_chat_id: null,
          telegram_username: null,
          telegram_linked_at: null,
          telegram_link_code: null,
          telegram_link_code_at: null,
        })
        .eq('id', linked.id)

      await replyTelegram(
        chatId,
        `Cuenta desvinculada (${linked.full_name}). Puedes volver a conectar desde el panel del Consultorio.`,
      )
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
      })
    }

    if (text === '/ayuda' || text.startsWith('/ayuda@')) {
      const panel = appUrl ? `\nPanel: ${appUrl}/dashboard/perfil` : ''
      await replyTelegram(
        chatId,
        `Bot de alertas — Consultorio Jurídico\n\n` +
          `• Recibirás avisos inmediatos de tus alertas (agrupadas por caso) tras cada sincronización.\n` +
          `• Un resumen diario con el resto de novedades.\n\n` +
          `Para vincular: Perfil en el panel → Conectar Telegram → pulsa Iniciar aquí.${panel}\n\n` +
          `/desvincular — desconectar esta cuenta`,
      )
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
      })
    }

    const startMatch = text.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i)
    if (startMatch) {
      const code = startMatch[1]?.trim()
      if (!code) {
        await replyTelegram(
          chatId,
          'Para vincular tu cuenta, genera un código en el panel (Perfil → Conectar Telegram) y vuelve aquí con ese enlace.',
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
        })
      }

      const { data: profile, error } = await admin
        .from('profiles')
        .select('id, full_name, telegram_link_code, telegram_link_code_at')
        .eq('telegram_link_code', code)
        .maybeSingle()

      if (error) throw new Error(error.message)

      const codeAt = profile?.telegram_link_code_at
        ? new Date(profile.telegram_link_code_at).getTime()
        : 0
      const expired =
        !profile ||
        !codeAt ||
        Date.now() - codeAt > LINK_CODE_TTL_MS

      if (expired) {
        await replyTelegram(
          chatId,
          'Código inválido o expirado (válido 30 minutos). Genera uno nuevo en Perfil → Conectar Telegram.',
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
        })
      }

      const { data: existingChat } = await admin
        .from('profiles')
        .select('id')
        .eq('telegram_chat_id', chatId)
        .neq('id', profile.id)
        .maybeSingle()

      if (existingChat) {
        await replyTelegram(
          chatId,
          'Este chat de Telegram ya está vinculado a otra cuenta. Usa /desvincular primero.',
        )
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'content-type': 'application/json' },
        })
      }

      await admin
        .from('profiles')
        .update({
          telegram_chat_id: chatId,
          telegram_username: username,
          telegram_linked_at: new Date().toISOString(),
          telegram_link_code: null,
          telegram_link_code_at: null,
          telegram_blocked_at: null,
        })
        .eq('id', profile.id)

      await replyTelegram(
        chatId,
        `Hola ${profile.full_name}, tu cuenta del Consultorio quedó vinculada.\n\n` +
          `Recibirás alertas de inmediato (agrupadas por caso) y un resumen diario.\n` +
          `Escribe /ayuda para más información.`,
      )
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' },
      })
    }

    await replyTelegram(
      chatId,
      'Comandos: /ayuda · /desvincular\nPara vincular, usa el enlace desde Perfil en el panel.',
    )

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
})
