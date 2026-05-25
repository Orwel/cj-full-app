import { areaLabels, formatDateTimeCo, formatFechaCo } from '@/lib/labels'
import { EstadoProcesoBadge } from '@/presentation/components/EstadoProcesoBadge'
import { parseSujetosProcesales } from '@/lib/sujetos-procesales'
import type { Caso } from '@/domain/entities/caso'
export function CasoJudicialSummary({ caso }: { caso: Caso }) {
  const sujetos = parseSujetosProcesales(caso.sujetosProcesales)
  const hasJudicial =
    caso.despacho ||
    caso.tipoProceso ||
    caso.ponente ||
    caso.sujetosProcesales ||
    caso.fechaUltimaActuacionRemota

  if (!hasJudicial && !caso.fechaUltimoScraping) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Aún no hay datos de la Rama Judicial. Usa «Sincronizar con Rama Judicial».
      </p>
    )
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold text-slate-900">Expediente judicial</h2>
        <EstadoProcesoBadge estado={caso.estadoProceso} />
        {caso.estadoCritico && (
          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-200">
            Estado crítico
          </span>
        )}
        {!caso.scrapingActivo && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            Scraping pausado
          </span>
        )}
      </div>
      {(sujetos.demandante || sujetos.demandado) && (
        <div className="mt-4 grid gap-2 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
          {sujetos.demandante && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Demandante</p>
              <p className="mt-0.5 font-medium text-slate-900">{sujetos.demandante}</p>
            </div>
          )}
          {sujetos.demandado && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Demandado</p>
              <p className="mt-0.5 text-slate-800">{sujetos.demandado}</p>
            </div>
          )}
        </div>
      )}
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <Item label="Área consultorio">{areaLabels[caso.area]}</Item>
        <Item label="Despacho">{caso.despacho ?? '—'}</Item>
        <Item label="Departamento">{caso.departamento ?? '—'}</Item>
        <Item label="Tipo proceso">{caso.tipoProceso ?? '—'}</Item>
        <Item label="Clase / Subclase">
          {[caso.claseProceso, caso.subclaseProceso].filter(Boolean).join(' · ') || '—'}
        </Item>
        <Item label="Ponente">{caso.ponente ?? '—'}</Item>
        <Item label="Recurso">{caso.recurso ?? '—'}</Item>
        <Item label="Ubicación">{caso.ubicacion ?? '—'}</Item>
        <Item label="Última actuación (Rama)">
          {formatFechaCo(caso.fechaUltimaActuacionRemota)}
        </Item>
        <Item label="Última sincronización">
          {formatDateTimeCo(caso.fechaUltimoScraping)}
        </Item>
        <Item label="Proceso reservado">{caso.esPrivado ? 'Sí' : 'No'}</Item>
        {caso.idProceso != null && (
          <Item label="ID proceso">
            <span className="font-mono text-xs">
              {caso.idProceso}
              {caso.idConexion != null ? ` / ${caso.idConexion}` : ''}
            </span>
          </Item>
        )}
      </dl>
      {caso.sujetosProcesales && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium uppercase text-slate-500">Sujetos procesales</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-800">{caso.sujetosProcesales}</p>
        </div>
      )}
    </section>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{children}</dd>
    </div>
  )
}
