import type { IJudicialConsultaService } from '@/domain/services/judicial-consulta.service'
import type {
  JudicialActuacion,
  JudicialActuacionesPagina,
  JudicialProcesoDetalle,
  JudicialProcesoListado,
} from '@/domain/judicial/judicial.types'
import { RamaJudicialClient } from '@/infrastructure/scraping/RamaJudicialClient'
import type { ActuacionApi, ProcesoListItem } from '@/infrastructure/scraping/types'

function mapListItem(p: ProcesoListItem): JudicialProcesoListado {
  return {
    idProceso: p.idProceso,
    idConexion: p.idConexion,
    llaveProceso: p.llaveProceso,
    fechaProceso: p.fechaProceso,
    fechaUltimaActuacion: p.fechaUltimaActuacion,
    despacho: p.despacho,
    departamento: p.departamento,
    sujetosProcesales: p.sujetosProcesales,
    esPrivado: p.esPrivado,
  }
}

function mapActuacion(a: ActuacionApi): JudicialActuacion {
  return {
    idRegActuacion: a.idRegActuacion,
    consActuacion: a.consActuacion,
    fechaActuacion: a.fechaActuacion,
    actuacion: a.actuacion,
    anotacion: a.anotacion,
    fechaInicial: a.fechaInicial,
    fechaFinal: a.fechaFinal,
    fechaRegistro: a.fechaRegistro,
    codRegla: a.codRegla,
    conDocumentos: a.conDocumentos,
  }
}

export class RamaJudicialConsultaService implements IJudicialConsultaService {
  async consultaPorRadicado(numero: string): Promise<JudicialProcesoListado[]> {
    const res = await RamaJudicialClient.consultaNumeroRadicacion(numero, 1)
    if (!res) {
      throw new Error('Sin respuesta de la Rama Judicial (listado)')
    }
    return (res.procesos ?? []).map(mapListItem)
  }

  async detalle(idProceso: number): Promise<JudicialProcesoDetalle | null> {
    const d = await RamaJudicialClient.detalle(idProceso)
    if (!d) return null
    return {
      idRegProceso: d.idRegProceso,
      llaveProceso: d.llaveProceso,
      idConexion: d.idConexion,
      esPrivado: d.esPrivado,
      fechaProceso: d.fechaProceso,
      codDespachoCompleto: d.codDespachoCompleto,
      despacho: d.despacho,
      ponente: d.ponente,
      tipoProceso: d.tipoProceso,
      claseProceso: d.claseProceso,
      subclaseProceso: d.subclaseProceso,
      recurso: d.recurso,
      ubicacion: d.ubicacion,
    }
  }

  async actuacionesPagina(
    idProceso: number,
    pagina: number,
  ): Promise<JudicialActuacionesPagina> {
    const res = await RamaJudicialClient.actuaciones(idProceso, pagina)
    if (!res) {
      throw new Error('Sin respuesta de la Rama Judicial (actuaciones)')
    }
    const pag = res.paginacion
    return {
      actuaciones: (res.actuaciones ?? []).map(mapActuacion),
      cantidadPaginas: Math.max(1, pag?.cantidadPaginas ?? 1),
      pagina: pag?.pagina ?? pagina,
    }
  }
}
