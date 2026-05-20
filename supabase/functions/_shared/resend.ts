import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const RESEND_API = 'https://api.resend.com/emails'

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function sendEmail(
  apiKey: string,
  from: string,
  to: string[],
  subject: string,
  html: string,
): Promise<boolean> {
  if (to.length === 0) return false
  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })
  return res.ok
}

/** Correos a estudiantes por alertas críticas/urgentes pendientes. */
export async function sendPendingStudentAlertEmails(
  admin: SupabaseClient,
): Promise<{ sent: number; skipped: number }> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  const appUrl = (Deno.env.get('APP_PUBLIC_URL') ?? '').replace(/\/$/, '')
  if (!apiKey || !from) return { sent: 0, skipped: 0 }

  const { data, error } = await admin
    .from('alertas')
    .select(
      `id, titulo, mensaje, tipo_alerta, casos ( numero_caso, radicado_judicial, student_id )`,
    )
    .is('email_sent_at', null)
    .in('tipo_alerta', ['critica', 'urgente'])
    .limit(25)

  if (error) throw new Error(error.message)

  let sent = 0
  let skipped = 0

  for (const row of data ?? []) {
    const caso = row.casos as { student_id: string | null } | null
    const sid = caso?.student_id
    if (!sid) {
      skipped++
      continue
    }
    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', sid)
      .maybeSingle()
    if (!profile?.email) {
      skipped++
      continue
    }

    const link = appUrl ? `${appUrl}/dashboard/alertas` : ''
    const html = `<p>Hola ${escapeHtml(profile.full_name)},</p><p><strong>${escapeHtml(row.titulo)}</strong></p><p>${escapeHtml(row.mensaje)}</p>${
      link ? `<p><a href="${link}">Ver alertas</a></p>` : ''
    }`

    const ok = await sendEmail(apiKey, from, [profile.email], `[Consultorio] ${row.titulo}`, html)
    if (!ok) continue
    await admin.from('alertas').update({ email_sent_at: new Date().toISOString() }).eq('id', row.id)
    sent++
  }

  return { sent, skipped }
}

export async function resolveAdminEmails(admin: SupabaseClient): Promise<string[]> {
  const override = Deno.env.get('ADMIN_ALERT_EMAIL')?.trim()
  if (override) return [override]

  const { data, error } = await admin
    .from('profiles')
    .select('email')
    .eq('role', 'admin')

  if (error) throw new Error(error.message)
  return (data ?? []).map((r) => r.email).filter(Boolean)
}

export async function sendAdminHealthEmail(
  admin: SupabaseClient,
  subject: string,
  htmlBody: string,
): Promise<number> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('RESEND_FROM_EMAIL')
  if (!apiKey || !from) return 0

  const emails = await resolveAdminEmails(admin)
  if (emails.length === 0) return 0

  const ok = await sendEmail(apiKey, from, emails, subject, htmlBody)
  return ok ? emails.length : 0
}
