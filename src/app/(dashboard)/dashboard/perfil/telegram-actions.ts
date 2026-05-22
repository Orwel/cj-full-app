'use server'

import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth/session'
import { buildTelegramDeepLink, generateLinkCode } from '@/lib/telegram/links'
import { createClient } from '@/lib/supabase/server'

export type TelegramActionResult =
  | { ok: true; deepLink: string; code: string }
  | { ok: false; message: string }

export async function generarLinkCodeAction(): Promise<TelegramActionResult> {
  const user = await getSessionUser()
  if (!user) {
    return { ok: false, message: 'Sesión no válida.' }
  }

  const botUser = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim()
  if (!botUser) {
    return {
      ok: false,
      message: 'Bot de Telegram no configurado (NEXT_PUBLIC_TELEGRAM_BOT_USERNAME).',
    }
  }

  const code = generateLinkCode()
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      telegram_link_code: code,
      telegram_link_code_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath('/dashboard/perfil')
  revalidatePath('/dashboard')

  return {
    ok: true,
    deepLink: buildTelegramDeepLink(botUser, code),
    code,
  }
}

export async function desconectarTelegramAction(): Promise<{
  ok: boolean
  message?: string
}> {
  const user = await getSessionUser()
  if (!user) return { ok: false, message: 'Sesión no válida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      telegram_chat_id: null,
      telegram_username: null,
      telegram_linked_at: null,
      telegram_link_code: null,
      telegram_link_code_at: null,
      telegram_blocked_at: null,
    })
    .eq('id', user.id)

  if (error) return { ok: false, message: error.message }

  revalidatePath('/dashboard/perfil')
  revalidatePath('/dashboard')
  return { ok: true }
}
