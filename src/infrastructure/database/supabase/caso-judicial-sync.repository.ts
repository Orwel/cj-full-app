import type { SupabaseClient } from '@supabase/supabase-js'
import type { JudicialActuacion } from '@/domain/judicial/judicial.types'
import type { EstadoTermino, Severidad } from '@/domain/services/alert-severity'
import { recomputeCaso } from '@/domain/services/alert-severity'
import { apiDateToSqlDate } from '@/infrastructure/scraping/date-judicial'

export type ScrapingLogStatus =
  | 'success'
  | 'error'
  | 'not_found'
  | 'invalid_format'
  | 'no_changes'

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

export class CasoJudicialSyncRepository {
  constructor(private readonly admin: SupabaseClient) {}

  async updateCaso(casoId: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.admin.from('casos').update(patch).eq('id', casoId)
    if (error) throw new Error(error.message)
  }

  async listActuacionIds(casoId: string): Promise<Set<number>> {
    const { data, error } = await this.admin
      .from('actuaciones')
      .select('id_reg_actuacion')
      .eq('caso_id', casoId)

    if (error) throw new Error(error.message)
    return new Set((data ?? []).map((r) => Number(r.id_reg_actuacion)))
  }

  async insertActuaciones(
    casoId: string,
    actuaciones: JudicialActuacion[],
  ): Promise<number> {
    if (actuaciones.length === 0) return 0

    const now = new Date().toISOString()

    const rows = actuaciones.map((a) => {
      const fechaFin = apiDateToSqlDate(a.fechaFinal)
      return {
        caso_id: casoId,
        id_reg_actuacion: a.idRegActuacion,
        cons_actuacion: a.consActuacion,
        fecha_actuacion: apiDateToSqlDate(a.fechaActuacion) ?? '1970-01-01',
        actuacion: a.actuacion.trim(),
        anotacion: a.anotacion?.trim() ?? null,
        fecha_inicio_termino: apiDateToSqlDate(a.fechaInicial),
        fecha_fin_termino: fechaFin,
        fecha_registro:
          apiDateToSqlDate(a.fechaRegistro) ??
          apiDateToSqlDate(a.fechaActuacion) ??
          '1970-01-01',
        con_documentos: a.conDocumentos,
        cod_regla: a.codRegla.trim(),
        severidad: 'informativa' as const,
        estado_termino: 'sin_termino' as const,
        es_nueva: true,
        scraped_at: now,
      }
    })

    const chunk = 200
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk)
      const { error } = await this.admin.from('actuaciones').insert(slice)
      if (error) throw new Error(error.message)
    }
    return rows.length
  }

  /**
   * Recalcula estados, severidad en actuaciones, alertas y flags del caso.
   */
  async recomputeSeverityAlertsAndEstadoCritico(casoId: string): Promise<void> {
    const ref = new Date()

    const { data: caso, error: e0 } = await this.admin
      .from('casos')
      .select('ubicacion')
      .eq('id', casoId)
      .single()
    if (e0) throw new Error(e0.message)

    const { data: acts, error: e1 } = await this.admin
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

    const { data: prevAlertas, error: e2 } = await this.admin
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
        const { error } = await this.admin
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
      const { error } = await this.admin.from('alertas').upsert(
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
      const { error } = await this.admin
        .from('alertas')
        .delete()
        .eq('caso_id', casoId)
        .in('actuacion_id', toRemove)
      if (error) throw new Error(error.message)
    }

    const { error: e3 } = await this.admin
      .from('casos')
      .update({
        estado_critico: computed.hayCritica,
        estado_proceso: computed.estadoProceso,
      })
      .eq('id', casoId)
    if (e3) throw new Error(e3.message)
  }

  /** Programa la próxima sonda vía RPC (no bloquea si falla). */
  async scheduleNextCasoCheck(casoId: string, hadMovement: boolean): Promise<void> {
    const { error } = await this.admin.rpc('schedule_next_caso_check', {
      p_caso_id: casoId,
      p_had_movement: hadMovement,
    })
    if (error) console.error('schedule_next_caso_check:', error.message)
  }

  async insertScrapingLog(input: {
    casoId: string | null
    radicado: string
    status: ScrapingLogStatus
    errorMessage?: string | null
    actuacionesNuevas: number
    durationMs: number
  }): Promise<void> {
    const { error } = await this.admin.from('scraping_logs').insert({
      caso_id: input.casoId,
      radicado: input.radicado,
      status: input.status,
      error_message: input.errorMessage ?? null,
      actuaciones_nuevas: input.actuacionesNuevas,
      duration_ms: input.durationMs,
    })
    if (error) throw new Error(error.message)
  }
}
