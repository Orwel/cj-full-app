import { assertCronAuth, createServiceAdmin } from '../_shared/cron-auth.ts'
import { escapeHtml, sendAdminTelegram } from '../_shared/telegram.ts'

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

    let telegramSent = 0
    if (staleCasos.length > 0 || unreadCriticas.length > 0) {
      const staleLines =
        staleCasos.length === 0
          ? 'Ninguno.'
          : staleCasos
              .map(
                (c) =>
                  `• <b>${escapeHtml(c.numero_caso)}</b> · <code>${escapeHtml(c.radicado_judicial)}</code>`,
              )
              .join('\n')

      const unreadLines =
        unreadCriticas.length === 0
          ? 'Ninguna.'
          : unreadCriticas
              .map(
                (a) =>
                  `• <b>${escapeHtml(a.numero_caso)}</b>: ${escapeHtml(a.titulo)}`,
              )
              .join('\n')

      const html =
        `<b>Alarma de salud — Consultorio</b>\n\n` +
        `<b>Casos sin sync exitosa (${staleHours}h)</b>\n${staleLines}\n\n` +
        `<b>Críticas sin leer (&gt;${unreadHours}h)</b>\n${unreadLines}\n\n` +
        `<i>${new Date().toISOString()}</i>`

      telegramSent = await sendAdminTelegram(admin, html)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        staleCasos: staleCasos.length,
        unreadCriticas: unreadCriticas.length,
        telegramSent,
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
