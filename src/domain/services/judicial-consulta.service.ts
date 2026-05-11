import type {
  JudicialActuacionesPagina,
  JudicialProcesoDetalle,
  JudicialProcesoListado,
} from '@/domain/judicial/judicial.types'

/**
 * Puerto de dominio: consulta a la Rama Judicial sin acoplar HTTP/Playwright.
 * @see docs/ARCHITECTURE.md
 */
export interface IJudicialConsultaService {
  consultaPorRadicado(numero: string): Promise<JudicialProcesoListado[]>
  detalle(idProceso: number): Promise<JudicialProcesoDetalle | null>
  actuacionesPagina(
    idProceso: number,
    pagina: number,
  ): Promise<JudicialActuacionesPagina>
}
