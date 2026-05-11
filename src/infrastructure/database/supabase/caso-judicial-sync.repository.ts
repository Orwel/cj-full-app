import type { SupabaseClient } from '@supabase/supabase-js'
import type { JudicialActuacion } from '@/domain/judicial/judicial.types'
import { apiDateToSqlDate } from '@/infrastructure/scraping/date-judicial'

export type ScrapingLogStatus =
  | 'success'
  | 'error'
  | 'not_found'
  | 'invalid_format'
  | 'no_changes'

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
    const rows = actuaciones.map((a) => ({
      caso_id: casoId,
      id_reg_actuacion: a.idRegActuacion,
      cons_actuacion: a.consActuacion,
      fecha_actuacion: apiDateToSqlDate(a.fechaActuacion) ?? '1970-01-01',
      actuacion: a.actuacion.trim(),
      anotacion: a.anotacion?.trim() ?? null,
      fecha_inicio_termino: apiDateToSqlDate(a.fechaInicial),
      fecha_fin_termino: apiDateToSqlDate(a.fechaFinal),
      fecha_registro:
        apiDateToSqlDate(a.fechaRegistro) ??
        apiDateToSqlDate(a.fechaActuacion) ??
        '1970-01-01',
      con_documentos: a.conDocumentos,
      cod_regla: a.codRegla.trim(),
      severidad: 'informativa' as const,
      es_nueva: true,
      scraped_at: now,
    }))

    const chunk = 200
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk)
      const { error } = await this.admin.from('actuaciones').insert(slice)
      if (error) throw new Error(error.message)
    }
    return rows.length
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
