export type TelegramLinkState = {
  linked: boolean
  blocked: boolean
  username: string | null
  linkedAt: string | null
  pendingCode: string | null
  pendingCodeAt: string | null
}

const LINK_TTL_MS = 30 * 60 * 1000

export function isLinkCodeValid(codeAt: string | null): boolean {
  if (!codeAt) return false
  return Date.now() - new Date(codeAt).getTime() <= LINK_TTL_MS
}

export function buildTelegramDeepLink(
  botUsername: string,
  code: string,
): string {
  const user = botUsername.replace(/^@/, '')
  return `https://t.me/${user}?start=${encodeURIComponent(code)}`
}

export function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i]! % chars.length]
  }
  return code
}
