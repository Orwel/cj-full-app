import type { SupabaseClient } from '@supabase/supabase-js'
import type { JudicialActuacion } from '@/domain/judicial/judicial.types'
import type { Severidad } from '@/domain/services/alert-severity'
import { severidadActuacion } from '@/domain/services/alert-severity'
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
}

type AlertaExisting = {
  actuacion_id: string | null
  leida: boolean
  email_sent_at: string | null
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

    const ref = new Date()
    const now = ref.toISOString()

    const { data: existingCons } = await this.admin
      .from('actuaciones')
      .select('cons_actuacion')
      .eq('caso_id', casoId)
    const maxCons = Math.max(
      0,
      ...(existingCons ?? []).map((r) => Number(r.cons_actuacion)),
      ...actuaciones.map((a) => a.consActuacion),
    )

    const rows = actuaciones.map((a) => {
      const fechaFin = apiDateToSqlDate(a.fechaFinal)
      const sev = severidadActuacion({
        actuacion: a.actuacion.trim(),
        anotacion: a.anotacion?.trim() ?? null,
        fechaFinTermino: fechaFin,
        referenceDate: ref,
        evaluarPatrones: a.consActuacion === maxCons,
      })
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
        severidad: sev,
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
   * Recalcula severidad en actuaciones, filas en `alertas` y `estado_critico` del caso.
   * Debe ejecutarse tras sync y también en `no_changes` (el plazo avanza sin novedad en API).
   */
  async recomputeSeverityAlertsAndEstadoCritico(casoId: string): Promise<void> {
    const ref = new Date()
    const { data: acts, error: e1 } = await this.admin
      .from('actuaciones')
      .select('id, cons_actuacion, actuacion, anotacion, fecha_fin_termino, severidad')
      .eq('caso_id', casoId)

    if (e1) throw new Error(e1.message)
    const list = (acts ?? []) as ActuacionRow[]
    const maxCons = list.reduce((m, a) => Math.max(m, a.cons_actuacion), 0)

    const { data: prevAlertas, error: e2 } = await this.admin
      .from('alertas')
      .select('actuacion_id, leida, email_sent_at')
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
        const { error } = await this.admin
          .from('actuaciones')
          .update({ severidad: sev })
          .eq('id', a.id)
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
      const { error } = await this.admin.from('alertas').upsert(
        {
          caso_id: casoId,
          actuacion_id: row.id,
          tipo_alerta: sev,
          titulo,
          mensaje,
          leida: prev?.leida ?? false,
          email_sent_at: prev?.email_sent_at ?? null,
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
      .update({ estado_critico: hayCritica })
      .eq('id', casoId)
    if (e3) throw new Error(e3.message)
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
