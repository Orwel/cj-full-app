import { assertCronAuth, createServiceAdmin } from '../_shared/cron-auth.ts'

type TickBody = { batchSize?: number }

Deno.serve(async (req) => {
  const denied = assertCronAuth(req)
  if (denied) return denied

  const secret = Deno.env.get('CRON_SECRET')!
  const baseUrl = Deno.env.get('SUPABASE_URL')!
  const oneCasoUrl = `${baseUrl}/functions/v1/sync-one-caso`

  let batchSize = 5
  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as TickBody
      if (body.batchSize != null && body.batchSize > 0 && body.batchSize <= 20) {
        batchSize = body.batchSize
      }
    } catch {
      /* body vacío OK */
    }
  }

  try {
    const admin = createServiceAdmin()
    const { data: claimed, error } = await admin.rpc('claim_sync_queue', {
      p_limit: batchSize,
    })

    if (error) throw new Error(error.message)
    const rows = claimed ?? []

    for (const row of rows) {
      const payload = JSON.stringify({ casoId: row.caso_id, queueId: row.id })
      fetch(oneCasoUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: payload,
      }).catch(() => {
        /* fire-and-forget; sync-one-caso actualiza sync_queue */
      })
    }

    return new Response(
      JSON.stringify({
        ok: true,
        claimed: rows.length,
        queueIds: rows.map((r: { id: string }) => r.id),
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
