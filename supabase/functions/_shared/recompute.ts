import { severidadActuacion, type Severidad } from './severidad.ts'
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

type ActuacionRow = {
  id: string
  cons_actuacion: number
  actuacion: string
  anotacion: string | null
  fecha_fin_termino: string | null
  severidad: Severidad
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
): { titulo: string; mensaje: string } {
  const resumen =
    actuacion.length > 180 ? `${actuacion.slice(0, 177).trim()}…` : actuacion.trim()
  const plazo = fechaFin ? `Fin de término: ${fechaFin}.` : ''
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
  const { data: acts, error: e1 } = await admin
    .from('actuaciones')
    .select('id, cons_actuacion, actuacion, anotacion, fecha_fin_termino, severidad')
    .eq('caso_id', casoId)

  if (e1) throw new Error(e1.message)
  const list = (acts ?? []) as ActuacionRow[]
  const maxCons = list.reduce((m, a) => Math.max(m, a.cons_actuacion), 0)

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

  let hayCritica = false
  const actuacionIds = new Set<string>()
  const rowsWithSev: { row: ActuacionRow; sev: Severidad }[] = []

  for (const a of list) {
    const sev = severidadActuacion({
      actuacion: a.actuacion,
      anotacion: a.anotacion,
      fechaFinTermino: a.fecha_fin_termino,
      referenceDate: ref,
      evaluarPatrones: a.cons_actuacion === maxCons,
    })
    if (sev === 'critica') hayCritica = true
    if (sev !== a.severidad) {
      const { error } = await admin.from('actuaciones').update({ severidad: sev }).eq('id', a.id)
      if (error) throw new Error(error.message)
    }
    rowsWithSev.push({ row: a, sev })
    actuacionIds.add(a.id)
  }

  for (const { row, sev } of rowsWithSev) {
    const prev = prevByActuacion.get(row.id)
    const { titulo, mensaje } = tituloYMensajeAlerta(
      row.cons_actuacion,
      row.actuacion,
      sev,
      row.fecha_fin_termino,
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
    .update({ estado_critico: hayCritica })
    .eq('id', casoId)
  if (e3) throw new Error(e3.message)
}
