export type TelegramSyncInfo = {
  sent: number
  skipped: number
  messages?: number
  channel: 'local' | 'edge' | 'none'
  hint?: string
}

export function formatTelegramSyncHint(result: TelegramSyncInfo): string | null {
  if (result.channel === 'none' && result.hint) {
    return result.hint
  }
  if (result.sent > 0) {
    const msgs = result.messages ?? 1
    const msgPart =
      msgs === 1
        ? '1 mensaje'
        : `${msgs} mensajes`
    return `Telegram: ${result.sent} alerta(s) en ${msgPart}.`
  }
  if (result.skipped > 0) {
    return 'Telegram: hay alertas pendientes pero no aplican a tu cuenta (vincula Telegram y, si eres admin, sigue el caso).'
  }
  return null
}
