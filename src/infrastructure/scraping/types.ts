/**
 * Tipos de la API pública de consulta procesos (Rama Judicial).
 * @see docs/SCRAPING.md
 */

export type ProcesoListItem = {
  idProceso: number
  idConexion: number
  llaveProceso: string
  fechaProceso: string
  fechaUltimaActuacion: string
  despacho: string
  departamento: string
  sujetosProcesales: string
  esPrivado: boolean
  cantFilas: number
}

export type PaginacionApi = {
  cantidadRegistros: number
  registrosPagina: number
  cantidadPaginas: number
  pagina: number
  paginas: number[] | null
}

export type ProcesoConsultaResponse = {
  tipoConsulta: string
  procesos: ProcesoListItem[]
  parametros: Record<string, unknown>
  paginacion: PaginacionApi
}

export type ProcesoDetalle = {
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
  contenidoRadicacion: string | null
  fechaConsulta: string
  ultimaActualizacion: string
}

export type ActuacionApi = {
  idRegActuacion: number
  llaveProceso: string
  consActuacion: number
  fechaActuacion: string
  actuacion: string
  anotacion: string | null
  fechaInicial: string | null
  fechaFinal: string | null
  fechaRegistro: string
  codRegla: string
  conDocumentos: boolean
  cant: number
}

export type ActuacionesResponse = {
  actuaciones: ActuacionApi[]
  paginacion: PaginacionApi
}
