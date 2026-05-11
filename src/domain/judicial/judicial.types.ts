/**
 * Tipos de dominio para consulta judicial (mapeados desde la API pública).
 * @see docs/SCRAPING.md
 */

export type JudicialProcesoListado = {
  idProceso: number
  idConexion: number
  llaveProceso: string
  fechaProceso: string
  fechaUltimaActuacion: string
  despacho: string
  departamento: string
  sujetosProcesales: string
  esPrivado: boolean
}

export type JudicialProcesoDetalle = {
  idRegProceso: number
  llaveProceso: string
  idConexion: number
  esPrivado: boolean
  fechaProceso: string
  codDespachoCompleto: string
  despacho: string
  ponente: string | null
  tipoProceso: string
  claseProceso: string
  subclaseProceso: string | null
  recurso: string
  ubicacion: string
}

export type JudicialActuacion = {
  idRegActuacion: number
  consActuacion: number
  fechaActuacion: string
  actuacion: string
  anotacion: string | null
  fechaInicial: string | null
  fechaFinal: string | null
  fechaRegistro: string
  codRegla: string
  conDocumentos: boolean
}

export type JudicialActuacionesPagina = {
  actuaciones: JudicialActuacion[]
  cantidadPaginas: number
  pagina: number
}
