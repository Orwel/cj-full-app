import { assertCronAuth, createServiceAdmin } from '../_shared/cron-auth.ts'
import { markQueueDone, markQueueFailed, shouldRetryScrapingStatus } from '../_shared/queue.ts'
import { recomputeSeverityAlertsAndEstadoCritico } from '../_shared/recompute.ts'
import { sendPendingStudentAlertEmails } from '../_shared/resend.ts'
import {
  isPermanentScrapingFailure,
  syncJudicialCaso,
  type CasoSyncRow,
} from '../_shared/sync-caso.ts'

type Body = {
  casoId?: string
  queueId?: string
}

Deno.serve(async (req) => {
  const denied = assertCronAuth(req)
  if (denied) return denied

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  const casoId = body.casoId
  const queueId = body.queueId
  if (!casoId || !queueId) {
    return new Response(
      JSON.stringify({ ok: false, error: 'casoId y queueId son obligatorios' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    )
  }

  try {
    const admin = createServiceAdmin()

    const { data: queueRow, error: qe } = await admin
      .from('sync_queue')
      .select('id, caso_id, job_type, status, attempts, max_attempts')
      .eq('id', queueId)
      .eq('caso_id', casoId)
      .maybeSingle()

    if (qe) throw new Error(qe.message)
    if (!queueRow) {
      return new Response(JSON.stringify({ ok: false, error: 'Cola no encontrada' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    }

    const { data: caso, error: ce } = await admin
      .from('casos')
      .select('id, radicado_judicial, id_proceso, fecha_ultima_actuacion_remota, scraping_activo')
      .eq('id', casoId)
      .maybeSingle()

    if (ce) throw new Error(ce.message)
    if (!caso) {
      await markQueueFailed(admin, queueId, queueRow.attempts, queueRow.max_attempts, 'Caso no encontrado', true)
      return new Response(JSON.stringify({ ok: false, error: 'Caso no encontrado' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      })
    }

    if (!caso.scraping_activo) {
      await markQueueDone(admin, queueId)
      return new Response(
        JSON.stringify({ ok: true, status: 'skipped', reason: 'scraping_activo=false' }),
        { headers: { 'content-type': 'application/json' } },
      )
    }

    if (queueRow.job_type === 'recalc_only') {
      await recomputeSeverityAlertsAndEstadoCritico(admin, casoId)
      await markQueueDone(admin, queueId)
      return new Response(
        JSON.stringify({ ok: true, status: 'recalc_only', casoId }),
        { headers: { 'content-type': 'application/json' } },
      )
    }

    const result = await syncJudicialCaso(admin, caso as CasoSyncRow)

    if (result.status === 'success' || result.status === 'no_changes') {
      await markQueueDone(admin, queueId)
      try {
        await sendPendingStudentAlertEmails(admin)
      } catch {
        /* no bloquear */
      }
      return new Response(
        JSON.stringify({ ok: true, casoId, queueId, ...result }),
        { headers: { 'content-type': 'application/json' } },
      )
    }

    const permanent = isPermanentScrapingFailure(result.status)
    const retry = shouldRetryScrapingStatus(result.status)
    await markQueueFailed(
      admin,
      queueId,
      queueRow.attempts,
      queueRow.max_attempts,
      result.error ?? result.status,
      permanent || !retry,
    )

    return new Response(
      JSON.stringify({ ok: false, casoId, queueId, ...result }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error'
    try {
      const admin = createServiceAdmin()
      const { data: q } = await admin
        .from('sync_queue')
        .select('attempts, max_attempts')
        .eq('id', queueId)
        .maybeSingle()
      if (q) {
        await markQueueFailed(admin, queueId, q.attempts, q.max_attempts, msg, false)
      }
    } catch {
      /* ignore */
    }
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
})
