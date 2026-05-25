import { assertCronAuth, createServiceAdmin } from '../_shared/cron-auth.ts'
import { sendPendingTelegramAlerts } from '../_shared/telegram.ts'

type Body = { casoId?: string }

Deno.serve(async (req) => {
  const denied = assertCronAuth(req)
  if (denied) return denied

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: Body = {}
  try {
    if (req.headers.get('content-length') !== '0') {
      body = (await req.json()) as Body
    }
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  try {
    const admin = createServiceAdmin()
    const { sent, skipped, messages } = await sendPendingTelegramAlerts(admin, {
      casoId: body.casoId,
    })
    return new Response(JSON.stringify({ ok: true, sent, skipped, messages }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
})
