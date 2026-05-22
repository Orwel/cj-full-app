import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { isLinkCodeValid, type TelegramLinkState } from '@/lib/telegram/links'

export type { TelegramLinkState } from '@/lib/telegram/links'

export async function getMyTelegramState(
  userId: string,
): Promise<TelegramLinkState> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(
      'telegram_chat_id, telegram_username, telegram_linked_at, telegram_link_code, telegram_link_code_at, telegram_blocked_at',
    )
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    return {
      linked: false,
      blocked: false,
      username: null,
      linkedAt: null,
      pendingCode: null,
      pendingCodeAt: null,
    }
  }

  const linked = data.telegram_chat_id != null && !data.telegram_blocked_at
  const pendingCode =
    data.telegram_link_code && isLinkCodeValid(data.telegram_link_code_at)
      ? data.telegram_link_code
      : null

  return {
    linked,
    blocked: data.telegram_blocked_at != null,
    username: data.telegram_username,
    linkedAt: data.telegram_linked_at,
    pendingCode,
    pendingCodeAt: data.telegram_link_code_at,
  }
}
