/** Tipos de alerta enviados en Telegram tras cada sync (agrupados por caso). */
export const TELEGRAM_IMMEDIATE_TYPES = [
  'critica',
  'urgente',
  'atencion',
  'informativa',
] as const

export const MAX_LINES_IN_GROUPED_MESSAGE = 8
export const MAX_PENDING_ALERTAS_FETCH = 100

export type AlertaPendiente = {
  id: string
  titulo: string
  mensaje: string
  tipo_alerta: string
  caso_id: string
  casos: {
    id: string
    numero_caso: string
    radicado_judicial: string
    student_id: string | null
  } | null
}

export type CasoGrupo = {
  casoId: string
  numeroCaso: string
  radicado: string
  studentId: string | null
  alertas: AlertaPendiente[]
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function severityEmoji(tipo: string): string {
  switch (tipo) {
    case 'critica':
      return '🔴'
    case 'urgente':
      return '🟠'
    case 'atencion':
      return '🟡'
    default:
      return 'ℹ️'
  }
}

function severityRank(tipo: string): number {
  switch (tipo) {
    case 'critica':
      return 0
    case 'urgente':
      return 1
    case 'atencion':
      return 2
    default:
      return 3
  }
}

export function groupAlertasByCaso(rows: AlertaPendiente[]): CasoGrupo[] {
  const map = new Map<string, CasoGrupo>()

  for (const row of rows) {
    const caso = row.casos
    if (!caso) continue

    let grupo = map.get(caso.id)
    if (!grupo) {
      grupo = {
        casoId: caso.id,
        numeroCaso: caso.numero_caso,
        radicado: caso.radicado_judicial,
        studentId: caso.student_id,
        alertas: [],
      }
      map.set(caso.id, grupo)
    }
    grupo.alertas.push(row)
  }

  for (const grupo of map.values()) {
    grupo.alertas.sort(
      (a, b) =>
        severityRank(a.tipo_alerta) - severityRank(b.tipo_alerta) ||
        a.titulo.localeCompare(b.titulo),
    )
  }

  return [...map.values()].sort((a, b) =>
    a.numeroCaso.localeCompare(b.numeroCaso),
  )
}

/** Un solo mensaje Telegram por caso con varias alertas pendientes. */
export function buildGroupedCasoMessage(
  grupo: CasoGrupo,
  appUrl: string,
  maxLines = MAX_LINES_IN_GROUPED_MESSAGE,
): string {
  const n = grupo.alertas.length
  const lines: string[] = [
    `<b>Consultorio — ${n} alerta${n === 1 ? '' : 's'}</b>`,
    `Caso: <b>${escapeHtml(grupo.numeroCaso)}</b>`,
    `Radicado: <code>${escapeHtml(grupo.radicado)}</code>`,
    '',
  ]

  for (const a of grupo.alertas.slice(0, maxLines)) {
    const resumen =
      a.mensaje.length > 120 ? `${a.mensaje.slice(0, 117).trim()}…` : a.mensaje
    lines.push(
      `${severityEmoji(a.tipo_alerta)} <b>${escapeHtml(a.titulo)}</b>\n${escapeHtml(resumen)}`,
    )
  }

  if (n > maxLines) {
    lines.push('', `… y ${n - maxLines} alerta(s) más en el panel.`)
  }

  if (appUrl) {
    lines.push(
      '',
      `<a href="${appUrl}/dashboard/casos/${grupo.casoId}">Ver caso</a> · ` +
        `<a href="${appUrl}/dashboard/alertas">Todas las alertas</a>`,
    )
  }

  return lines.join('\n').slice(0, 4096)
}

/** Mensaje individual (compatibilidad / una sola alerta crítica). */
export function buildSingleAlertaMessage(
  titulo: string,
  mensaje: string,
  numeroCaso: string,
  radicado: string,
  tipoAlerta: string,
  appUrl: string,
): string {
  const link = appUrl ? `\n<a href="${appUrl}/dashboard/alertas">Ver alertas</a>` : ''
  return (
    `${severityEmoji(tipoAlerta)} <b>[${escapeHtml(tipoAlerta.toUpperCase())}] ${escapeHtml(titulo)}</b>\n` +
    `Caso: <b>${escapeHtml(numeroCaso)}</b>\n` +
    `Radicado: <code>${escapeHtml(radicado)}</code>\n\n` +
    `${escapeHtml(mensaje)}${link}`
  )
}
