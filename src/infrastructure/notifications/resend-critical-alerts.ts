import type { SupabaseClient } from '@supabase/supabase-js'

const RESEND_API = 'https://api.resend.com/emails'

type AlertaPendienteRow = {
  id: string
  titulo: string
  mensaje: string
  tipo_alerta: string
  casos: {
    numero_caso: string
    radicado_judicial: string
    student_id: string | null
  } | null
}

/**
 * Envía correos vía Resend para alertas críticas/urgentes sin `email_sent_at`.
 * Idempotente: marca `email_sent_at` tras éxito.
 */
export async function sendPendingAlertEmailsResend(
  admin: SupabaseClient,
  options: { apiKey: string; from: string; appBaseUrl?: string },
): Promise<{ sent: number; skipped: number }> {
  const { apiKey, from, appBaseUrl } = options
  const base = appBaseUrl?.replace(/\/$/, '') ?? ''

  const { data, error } = await admin
    .from('alertas')
    .select(
      `id, titulo, mensaje, tipo_alerta,
       casos ( numero_caso, radicado_judicial, student_id )`,
    )
    .is('email_sent_at', null)
    .in('tipo_alerta', ['critica', 'urgente'])
    .limit(25)

  if (error) throw new Error(error.message)
  const rows = (data ?? []) as unknown as AlertaPendienteRow[]

  let sent = 0
  let skipped = 0

  for (const row of rows) {
    const caso = row.casos
    const studentId = caso?.student_id
    if (!studentId) {
      skipped++
      continue
    }

    const { data: profile, error: pe } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', studentId)
      .maybeSingle()

    if (pe || !profile?.email) {
      skipped++
      continue
    }

    const subject = `[Consultorio] ${row.titulo}`
    const link = base ? `${base}/dashboard/alertas` : ''
    const html = `
      <p>Hola ${escapeHtml(profile.full_name)},</p>
      <p><strong>${escapeHtml(row.titulo)}</strong></p>
      <p>${escapeHtml(row.mensaje)}</p>
      ${
        caso
          ? `<p>Caso: ${escapeHtml(caso.numero_caso)} · Radicado ${escapeHtml(caso.radicado_judicial)}</p>`
          : ''
      }
      ${link ? `<p><a href="${link}">Ver alertas en el panel</a></p>` : ''}
    `

    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [profile.email],
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      throw new Error(`Resend ${res.status}: ${t}`)
    }

    const { error: ue } = await admin
      .from('alertas')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', row.id)

    if (ue) throw new Error(ue.message)
    sent++
  }

  return { sent, skipped }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
