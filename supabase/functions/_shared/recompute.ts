import {
  recomputeCaso,
  type EstadoTermino,
  type Severidad,
} from './severidad.ts'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type ActuacionRow = {
  id: string
  cons_actuacion: number
  actuacion: string
  anotacion: string | null
  fecha_fin_termino: string | null
  severidad: Severidad
  estado_termino: EstadoTermino
}

type AlertaExisting = {
  actuacion_id: string | null
  leida: boolean
  telegram_sent_at: string | null
}

function tituloYMensajeAlerta(
  cons: number,
  actuacion: string,
  sev: Severidad,
  fechaFin: string | null,
  estadoTermino: EstadoTermino,
): { titulo: string; mensaje: string } {
  const resumen =
    actuacion.length > 180 ? `${actuacion.slice(0, 177).trim()}…` : actuacion.trim()
  let plazo = fechaFin ? `Fin de término: ${fechaFin}.` : ''
  if (estadoTermino === 'atendido') plazo = plazo ? `${plazo} Plazo atendido.` : 'Plazo atendido.'
  if (estadoTermino === 'cerrado_proceso') {
    plazo = plazo ? `${plazo} Expediente archivado.` : 'Expediente archivado.'
  }
  const titulo =
    sev === 'critica'
      ? `Crítico · Actuación #${cons}`
      : sev === 'urgente'
        ? `Urgente · Actuación #${cons}`
        : sev === 'atencion'
          ? `Atención · Actuación #${cons}`
          : `Actuación #${cons}`
  const mensaje = [resumen, plazo].filter(Boolean).join(' ')
  return { titulo, mensaje }
}

export async function recomputeSeverityAlertsAndEstadoCritico(
  admin: SupabaseClient,
  casoId: string,
): Promise<void> {
  const ref = new Date()

  const { data: caso, error: e0 } = await admin
    .from('casos')
    .select('ubicacion')
    .eq('id', casoId)
    .single()
  if (e0) throw new Error(e0.message)

  const { data: acts, error: e1 } = await admin
    .from('actuaciones')
    .select(
      'id, cons_actuacion, actuacion, anotacion, fecha_fin_termino, severidad, estado_termino',
    )
    .eq('caso_id', casoId)

  if (e1) throw new Error(e1.message)
  const list = (acts ?? []) as ActuacionRow[]

  const computed = recomputeCaso({
    ubicacion: (caso?.ubicacion as string | null) ?? null,
    actuaciones: list,
    referenceDate: ref,
  })

  const byId = new Map(computed.actuaciones.map((a) => [a.id, a]))

  const { data: prevAlertas, error: e2 } = await admin
    .from('alertas')
    .select('actuacion_id, leida, telegram_sent_at')
    .eq('caso_id', casoId)

  if (e2) throw new Error(e2.message)
  const prevByActuacion = new Map<string, AlertaExisting>()
  for (const r of prevAlertas ?? []) {
    if (r.actuacion_id) {
      prevByActuacion.set(r.actuacion_id, r as AlertaExisting)
    }
  }

  const actuacionIds = new Set<string>()
  const rowsWithMeta: {
    row: ActuacionRow
    sev: Severidad
    estadoTermino: EstadoTermino
  }[] = []

  for (const a of list) {
    const c = byId.get(a.id)
    if (!c) continue
    const { severidad: sev, estado_termino: estadoTermino } = c

    if (sev !== a.severidad || estadoTermino !== a.estado_termino) {
      const { error } = await admin
        .from('actuaciones')
        .update({ severidad: sev, estado_termino: estadoTermino })
        .eq('id', a.id)
      if (error) throw new Error(error.message)
    }

    rowsWithMeta.push({ row: a, sev, estadoTermino })
    actuacionIds.add(a.id)
  }

  for (const { row, sev, estadoTermino } of rowsWithMeta) {
    const prev = prevByActuacion.get(row.id)
    const { titulo, mensaje } = tituloYMensajeAlerta(
      row.cons_actuacion,
      row.actuacion,
      sev,
      row.fecha_fin_termino,
      estadoTermino,
    )
    const { error } = await admin.from('alertas').upsert(
      {
        caso_id: casoId,
        actuacion_id: row.id,
        tipo_alerta: sev,
        titulo,
        mensaje,
        leida: prev?.leida ?? false,
        telegram_sent_at: prev?.telegram_sent_at ?? null,
      },
      { onConflict: 'caso_id,actuacion_id' },
    )
    if (error) throw new Error(error.message)
  }

  const toRemove = [...prevByActuacion.keys()].filter((id) => !actuacionIds.has(id))
  if (toRemove.length > 0) {
    const { error } = await admin
      .from('alertas')
      .delete()
      .eq('caso_id', casoId)
      .in('actuacion_id', toRemove)
    if (error) throw new Error(error.message)
  }

  const { error: e3 } = await admin
    .from('casos')
    .update({
      estado_critico: computed.hayCritica,
      estado_proceso: computed.estadoProceso,
    })
    .eq('id', casoId)
  if (e3) throw new Error(e3.message)
}
