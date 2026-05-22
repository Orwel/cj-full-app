import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile } from '@/lib/auth/session'
import { areaLabels, formatDateTimeCo, formatFechaCo } from '@/lib/labels'
import { parseSujetosProcesales } from '@/lib/sujetos-procesales'
import { ActuacionesTable } from '@/presentation/components/ActuacionesTable'
import { CasoJudicialSummary } from '@/presentation/components/CasoJudicialSummary'
import { CasoNotificacionesActions } from '@/presentation/components/CasoNotificacionesActions'
import { createClient } from '@/lib/supabase/server'

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
  const isAdmin = profile.role === 'admin'
  const isOwner = caso.studentId === profile.id
  const supabase = await createClient()

  let adminSubscribed = false
  if (isAdmin) {
    const { data: sub } = await supabase
      .from('caso_suscriptores')
      .select('caso_id')
      .eq('caso_id', id)
      .eq('profile_id', profile.id)
      .maybeSingle()
    adminSubscribed = !!sub
  }

  let ownerHasTelegram: boolean | undefined
  if (isOwner && caso.studentId) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('telegram_chat_id')
      .eq('id', caso.studentId)
      .maybeSingle()
    ownerHasTelegram = ownerProfile?.telegram_chat_id != null
  }

  return (
    <div>
      <Link
        href="/dashboard/casos"
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Volver a casos
      </Link>

      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{caso.numeroCaso}</p>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Expediente</h1>
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
        <CasoNotificacionesActions
          casoId={caso.id}
          isAdmin={isAdmin}
          isOwner={isOwner}
          adminSubscribed={adminSubscribed}
          ownerHasTelegram={ownerHasTelegram}
        />
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
