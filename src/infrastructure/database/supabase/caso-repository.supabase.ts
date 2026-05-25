import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Area,
  Caso,
  CreateCasoInput,
  EstadoProceso,
  UpdateCasoInput,
} from '@/domain/entities/caso'
import type { ICasoRepository } from '@/domain/repositories/caso-repository'

type CasoRow = {
  id: string
  numero_caso: string
  radicado_judicial: string
  area: Area
  student_id: string | null
  notas: string | null
  id_proceso: number | null
  id_conexion: number | null
  despacho: string | null
  departamento: string | null
  sujetos_procesales: string | null
  fecha_proceso: string | null
  fecha_ultima_actuacion_remota: string | null
  es_privado: boolean
  id_reg_proceso: number | null
  cod_despacho_completo: string | null
  ponente: string | null
  tipo_proceso: string | null
  clase_proceso: string | null
  subclase_proceso: string | null
  recurso: string | null
  ubicacion: string | null
  estado_proceso: EstadoProceso
  estado_critico: boolean
  scraping_activo: boolean
  fecha_ultimo_scraping: string | null
  created_at: string
  updated_at: string
}

function mapRow(row: CasoRow): Caso {
  return {
    id: row.id,
    numeroCaso: row.numero_caso,
    radicadoJudicial: row.radicado_judicial,
    area: row.area,
    studentId: row.student_id,
    notas: row.notas,
    idProceso: row.id_proceso,
    idConexion: row.id_conexion,
    despacho: row.despacho,
    departamento: row.departamento,
    sujetosProcesales: row.sujetos_procesales,
    fechaProceso: row.fecha_proceso,
    fechaUltimaActuacionRemota: row.fecha_ultima_actuacion_remota,
    esPrivado: row.es_privado,
    idRegProceso: row.id_reg_proceso,
    codDespachoCompleto: row.cod_despacho_completo,
    ponente: row.ponente,
    tipoProceso: row.tipo_proceso,
    claseProceso: row.clase_proceso,
    subclaseProceso: row.subclase_proceso,
    recurso: row.recurso,
    ubicacion: row.ubicacion,
    estadoProceso: row.estado_proceso ?? 'indeterminado',
    estadoCritico: row.estado_critico,
    scrapingActivo: row.scraping_activo,
    fechaUltimoScraping: row.fecha_ultimo_scraping,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SupabaseCasoRepository implements ICasoRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(): Promise<Caso[]> {
    const { data, error } = await this.supabase
      .from('casos')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data as CasoRow[]).map(mapRow)
  }

  async getById(id: string): Promise<Caso | null> {
    const { data, error } = await this.supabase
      .from('casos')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data) return null
    return mapRow(data as CasoRow)
  }

  async create(input: CreateCasoInput): Promise<Caso> {
    const { data, error } = await this.supabase
      .from('casos')
      .insert({
        numero_caso: input.numeroCaso,
        radicado_judicial: input.radicadoJudicial,
        area: input.area,
        student_id: input.studentId,
        notas: input.notas,
      })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return mapRow(data as CasoRow)
  }

  async update(id: string, input: UpdateCasoInput): Promise<Caso> {
    const patch: Record<string, unknown> = {}
    if (input.numeroCaso !== undefined) patch.numero_caso = input.numeroCaso
    if (input.radicadoJudicial !== undefined)
      patch.radicado_judicial = input.radicadoJudicial
    if (input.area !== undefined) patch.area = input.area
    if (input.studentId !== undefined) patch.student_id = input.studentId
    if (input.notas !== undefined) patch.notas = input.notas

    const { data, error } = await this.supabase
      .from('casos')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return mapRow(data as CasoRow)
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('casos').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
}
