import type { Caso } from '@/domain/entities/caso'
import type { JudicialActuacion } from '@/domain/judicial/judicial.types'
import type { IJudicialConsultaService } from '@/domain/services/judicial-consulta.service'
import { apiDateToSqlDate } from '@/infrastructure/scraping/date-judicial'
import {
  CasoJudicialSyncRepository,
  type ScrapingLogStatus,
} from '@/infrastructure/database/supabase/caso-judicial-sync.repository'

const RADICADO_RE = /^[0-9]{23}$/

import type { TelegramSyncInfo } from '@/lib/telegram/sync-hints'

export type { TelegramSyncInfo }

export type SincronizarCasoJudicialResult =
  | {
      ok: true
      status: 'success' | 'no_changes'
      actuacionesNuevas: number
      telegram?: TelegramSyncInfo
    }
  | {
      ok: false
      status: 'invalid_format' | 'not_found' | 'error'
      message: string
    }

export class SincronizarCasoJudicialUseCase {
  constructor(
    private readonly judicial: IJudicialConsultaService,
    private readonly sync: CasoJudicialSyncRepository,
  ) {}

  async execute(caso: Caso): Promise<SincronizarCasoJudicialResult> {
    const started = Date.now()
    const radicado = caso.radicadoJudicial.trim()
    const finishLog = async (
      status: ScrapingLogStatus,
      actuacionesNuevas: number,
      errorMessage: string | null,
    ) => {
      await this.sync.insertScrapingLog({
        casoId: caso.id,
        radicado,
        status,
        errorMessage,
        actuacionesNuevas,
        durationMs: Date.now() - started,
      })
    }

    if (!RADICADO_RE.test(radicado)) {
      await finishLog('invalid_format', 0, 'Radicado debe tener 23 dígitos')
      return {
        ok: false,
        status: 'invalid_format',
        message: 'El radicado judicial debe tener exactamente 23 dígitos.',
      }
    }

    try {
      const procesos = await this.judicial.consultaPorRadicado(radicado)
      if (procesos.length === 0) {
        await finishLog('not_found', 0, 'Sin procesos para este radicado')
        return {
          ok: false,
          status: 'not_found',
          message:
            'La Rama Judicial no devolvió procesos para este radicado. Verifica el número.',
        }
      }

      const proceso =
        procesos.find((p) => p.llaveProceso.replace(/\D/g, '') === radicado) ??
        procesos[0]

      const fechaUltimaApi = apiDateToSqlDate(proceso.fechaUltimaActuacion)
      const fechaRemotaDb = caso.fechaUltimaActuacionRemota

      if (
        caso.idProceso != null &&
        proceso.idProceso === caso.idProceso &&
        fechaUltimaApi != null &&
        fechaUltimaApi === fechaRemotaDb
      ) {
        await this.sync.updateCaso(caso.id, {
          fecha_ultimo_scraping: new Date().toISOString(),
        })
        await this.sync.recomputeSeverityAlertsAndEstadoCritico(caso.id)
        await finishLog('no_changes', 0, null)
        return { ok: true, status: 'no_changes', actuacionesNuevas: 0 }
      }

      const detalle = await this.judicial.detalle(proceso.idProceso)
      if (!detalle) {
        await finishLog('error', 0, 'Detalle vacío o no encontrado')
        return {
          ok: false,
          status: 'error',
          message: 'No se pudo obtener el detalle del proceso en la Rama Judicial.',
        }
      }

      const primera = await this.judicial.actuacionesPagina(
        proceso.idProceso,
        1,
      )
      const totalPaginas = Math.max(1, primera.cantidadPaginas)
      const todas: JudicialActuacion[] = [...primera.actuaciones]
      for (let p = 2; p <= totalPaginas; p++) {
        const pag = await this.judicial.actuacionesPagina(proceso.idProceso, p)
        todas.push(...pag.actuaciones)
      }

      const existentes = await this.sync.listActuacionIds(caso.id)
      const nuevas = todas.filter((a) => !existentes.has(a.idRegActuacion))

      const despacho = proceso.despacho?.trim() ?? proceso.despacho

      await this.sync.updateCaso(caso.id, {
        id_proceso: proceso.idProceso,
        id_conexion: proceso.idConexion,
        despacho,
        departamento: proceso.departamento,
        sujetos_procesales: proceso.sujetosProcesales,
        fecha_proceso: apiDateToSqlDate(proceso.fechaProceso),
        fecha_ultima_actuacion_remota: fechaUltimaApi,
        es_privado: proceso.esPrivado,
        id_reg_proceso: detalle.idRegProceso,
        cod_despacho_completo: detalle.codDespachoCompleto,
        ponente: detalle.ponente,
        tipo_proceso: detalle.tipoProceso,
        clase_proceso: detalle.claseProceso,
        subclase_proceso: detalle.subclaseProceso,
        recurso: detalle.recurso,
        ubicacion: detalle.ubicacion,
        fecha_ultimo_scraping: new Date().toISOString(),
      })

      const insertadas = await this.sync.insertActuaciones(caso.id, nuevas)
      await this.sync.recomputeSeverityAlertsAndEstadoCritico(caso.id)
      await finishLog('success', insertadas, null)

      return { ok: true, status: 'success', actuacionesNuevas: insertadas }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      try {
        await finishLog('error', 0, msg)
      } catch {
        /* si falla el log, devolvemos el error principal */
      }
      return {
        ok: false,
        status: 'error',
        message: msg,
      }
    }
  }
}
