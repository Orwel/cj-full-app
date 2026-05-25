export const AREAS = [
  'civil',
  'laboral',
  'penal',
  'familia',
  'administrativo',
] as const

export type Area = (typeof AREAS)[number]

export type EstadoProceso = 'abierto' | 'archivado' | 'indeterminado'

export type Caso = {
  id: string
  numeroCaso: string
  radicadoJudicial: string
  area: Area
  studentId: string | null
  notas: string | null
  idProceso: number | null
  idConexion: number | null
  despacho: string | null
  departamento: string | null
  sujetosProcesales: string | null
  fechaProceso: string | null
  fechaUltimaActuacionRemota: string | null
  esPrivado: boolean
  idRegProceso: number | null
  codDespachoCompleto: string | null
  ponente: string | null
  tipoProceso: string | null
  claseProceso: string | null
  subclaseProceso: string | null
  recurso: string | null
  ubicacion: string | null
  estadoProceso: EstadoProceso
  estadoCritico: boolean
  scrapingActivo: boolean
  fechaUltimoScraping: string | null
  createdAt: string
  updatedAt: string
}

export type CreateCasoInput = {
  numeroCaso: string
  radicadoJudicial: string
  area: Area
  studentId: string | null
  notas: string | null
}

export type UpdateCasoInput = Partial<
  Pick<
    CreateCasoInput,
    'numeroCaso' | 'radicadoJudicial' | 'area' | 'studentId' | 'notas'
  >
>
