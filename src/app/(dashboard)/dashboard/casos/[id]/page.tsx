import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile, listStudentProfiles } from '@/lib/auth/session'
import { ActuacionesTable } from '@/presentation/components/ActuacionesTable'
import { CasoForm } from '@/presentation/components/CasoForm'
import { DeleteCasoButton } from '@/presentation/components/DeleteCasoButton'
import { SyncCasoJudicialButton } from '@/presentation/components/SyncCasoJudicialButton'
import { updateCasoAction } from '../caso-actions'

export default async function EditCasoPage({
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

  const isAdmin = profile.role === 'admin'
  const students = isAdmin ? await listStudentProfiles() : []

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
          <h1 className="text-2xl font-semibold text-slate-900">Editar caso</h1>
          <p className="mt-1 font-mono text-sm text-slate-600">
            {caso.radicadoJudicial}
          </p>
          {caso.fechaUltimoScraping && (
            <p className="mt-1 text-xs text-slate-500">
              Última sincronización:{' '}
              {new Date(caso.fechaUltimoScraping).toLocaleString('es-CO')}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <SyncCasoJudicialButton casoId={caso.id} />
          {isAdmin && <DeleteCasoButton casoId={caso.id} />}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <CasoForm
          mode="edit"
          action={updateCasoAction.bind(null, caso.id)}
          isAdmin={isAdmin}
          students={students}
          initial={caso}
        />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Actuaciones</h2>
        <p className="mt-1 text-sm text-slate-600">
          Datos persistidos tras sincronizar con la consulta pública.
        </p>
        <div className="mt-4">
          <ActuacionesTable casoId={caso.id} />
        </div>
      </div>
    </div>
  )
}
