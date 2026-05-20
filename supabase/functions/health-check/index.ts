import { assertCronAuth, createServiceAdmin } from '../_shared/cron-auth.ts'
import { sendAdminHealthEmail } from '../_shared/resend.ts'

function hoursEnv(name: string, fallback: number): number {
  const n = Number(Deno.env.get(name))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

type StaleCaso = {
  id: string
  numero_caso: string
  radicado_judicial: string
}

type UnreadCritica = {
  id: string
  titulo: string
  numero_caso: string
  radicado_judicial: string
}

Deno.serve(async (req) => {
  const denied = assertCronAuth(req)
  if (denied) return denied

  try {
    const admin = createServiceAdmin()
    const staleHours = hoursEnv('HEALTH_STALE_HOURS', 48)
    const unreadHours = hoursEnv('HEALTH_UNREAD_CRITICAL_HOURS', 24)
    const staleCutoff = new Date(Date.now() - staleHours * 3_600_000).toISOString()
    const unreadCutoff = new Date(Date.now() - unreadHours * 3_600_000).toISOString()

    const { data: casosActivos, error: e1 } = await admin
      .from('casos')
      .select('id, numero_caso, radicado_judicial')
      .eq('scraping_activo', true)

    if (e1) throw new Error(e1.message)

    const staleCasos: StaleCaso[] = []
    for (const c of casosActivos ?? []) {
      const { data: logs, error: le } = await admin
        .from('scraping_logs')
        .select('id')
        .eq('caso_id', c.id)
        .in('status', ['success', 'no_changes'])
        .gte('created_at', staleCutoff)
        .limit(1)
      if (le) throw new Error(le.message)
      if (!logs || logs.length === 0) {
        staleCasos.push(c as StaleCaso)
      }
    }

    const { data: unreadRows, error: e2 } = await admin
      .from('alertas')
      .select(
        `id, titulo, created_at, casos ( numero_caso, radicado_judicial )`,
      )
      .eq('tipo_alerta', 'critica')
      .eq('leida', false)
      .lt('created_at', unreadCutoff)
      .limit(50)

    if (e2) throw new Error(e2.message)

    const unreadCriticas: UnreadCritica[] = (unreadRows ?? []).map((r) => {
      const caso = r.casos as { numero_caso: string; radicado_judicial: string } | null
      return {
        id: r.id,
        titulo: r.titulo,
        numero_caso: caso?.numero_caso ?? '—',
        radicado_judicial: caso?.radicado_judicial ?? '—',
      }
    })

    let emailsSent = 0
    if (staleCasos.length > 0 || unreadCriticas.length > 0) {
      const staleList =
        staleCasos.length === 0
          ? '<p>Ninguno.</p>'
          : `<ul>${staleCasos
              .map(
                (c) =>
                  `<li><strong>${c.numero_caso}</strong> · ${c.radicado_judicial}</li>`,
              )
              .join('')}</ul>`

      const unreadList =
        unreadCriticas.length === 0
          ? '<p>Ninguna.</p>'
          : `<ul>${unreadCriticas
              .map(
                (a) =>
                  `<li><strong>${a.numero_caso}</strong> · ${a.radicado_judicial}: ${a.titulo}</li>`,
              )
              .join('')}</ul>`

      const html = `
        <h2>Alarma de salud — Consultorio Jurídico</h2>
        <p>Revisión automática del sistema de monitoreo.</p>
        <h3>Casos sin sincronización exitosa (últimas ${staleHours} h)</h3>
        ${staleList}
        <h3>Alertas críticas sin leer (más de ${unreadHours} h)</h3>
        ${unreadList}
        <p><em>Generado: ${new Date().toISOString()}</em></p>
      `

      emailsSent = await sendAdminHealthEmail(
        admin,
        `[Consultorio] Alarma de salud: ${staleCasos.length} caso(s), ${unreadCriticas.length} alerta(s) crítica(s)`,
        html,
      )
    }

    return new Response(
      JSON.stringify({
        ok: true,
        staleCasos: staleCasos.length,
        unreadCriticas: unreadCriticas.length,
        emailsSent,
        staleHours,
        unreadHours,
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
