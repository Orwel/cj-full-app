/**
 * @deprecated Usar cola: enqueue_daily_sync_jobs + sync-tick + sync-one-caso.
 * Este endpoint solo encola trabajos del día (compatibilidad con cron HTTP antiguo).
 */
import { assertCronAuth, createServiceAdmin } from '../_shared/cron-auth.ts'

Deno.serve(async (req) => {
  const denied = assertCronAuth(req)
  if (denied) return denied

  try {
    const admin = createServiceAdmin()
    const { data, error } = await admin.rpc('enqueue_daily_sync_jobs')

    if (error) throw new Error(error.message)

    return new Response(
      JSON.stringify({
        ok: true,
        message:
          'Trabajos encolados. El worker sync-tick procesará la cola. Migra el cron a enqueue SQL + sync-tick cada 2 min.',
        enqueue: data,
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
