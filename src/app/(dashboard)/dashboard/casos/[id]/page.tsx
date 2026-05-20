import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile } from '@/lib/auth/session'
import { areaLabels, formatDateTimeCo, formatFechaCo } from '@/lib/labels'
import { parseSujetosProcesales } from '@/lib/sujetos-procesales'
import { ActuacionesTable } from '@/presentation/components/ActuacionesTable'
import { CasoJudicialSummary } from '@/presentation/components/CasoJudicialSummary'
import { SyncCasoJudicialButton } from '@/presentation/components/SyncCasoJudicialButton'

export default async function VerCasoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getMyProfile()
  if (!profile) return null

  const ctx = await createCasosContext()
  const caso = await ctx.getCaso.execute(id)
  if (!caso) notFound()

  const sujetos = parseSujetosProcesales(caso.sujetosProcesales)
  return (
    <div>
      <Link
        href="/dashboard/casos"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Volver a casos
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{caso.numeroCaso}</p>
          <h1 className="text-2xl font-semibold text-slate-900">Expediente</h1>
          <p className="mt-1 font-mono text-sm text-slate-700">{caso.radicadoJudicial}</p>
          {sujetos.demandante && (
            <p className="mt-2 text-sm text-slate-800">
              <span className="font-medium text-slate-600">Demandante: </span>
              {sujetos.demandante}
            </p>
          )}
          {sujetos.demandado && (
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium text-slate-600">Demandado: </span>
              {sujetos.demandado}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
              {areaLabels[caso.area]}
            </span>
            {caso.estadoCritico && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">
                Estado crítico
              </span>
            )}
            {!caso.scrapingActivo && (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">
                Scraping pausado
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Última sync: {formatDateTimeCo(caso.fechaUltimoScraping)} · Última actuación Rama:{' '}
            {formatFechaCo(caso.fechaUltimaActuacionRemota)}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <SyncCasoJudicialButton casoId={caso.id} />
          <Link
            href={`/dashboard/casos/${caso.id}/editar`}
            className="inline-flex justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Editar datos del consultorio
          </Link>
          <Link
            href={`/dashboard/alertas?pendientes=1`}
            className="text-center text-sm text-blue-700 hover:underline"
          >
            Ver alertas del consultorio
          </Link>
        </div>
      </div>

      <CasoJudicialSummary caso={caso} />

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Actuaciones</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ordenadas por consecutivo descendente (la más reciente arriba). Plazos y documentos según
          la consulta pública.
        </p>
        <div className="mt-4">
          <ActuacionesTable casoId={caso.id} showInicioTermino showDocumentos />
        </div>
      </div>
    </div>
  )
}
