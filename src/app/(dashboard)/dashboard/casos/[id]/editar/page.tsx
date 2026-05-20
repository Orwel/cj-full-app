import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile, listStudentProfiles } from '@/lib/auth/session'
import { CasoForm } from '@/presentation/components/CasoForm'
import { DeleteCasoButton } from '@/presentation/components/DeleteCasoButton'
import { updateCasoAction } from '../../caso-actions'

export default async function EditarCasoPage({
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
        href={`/dashboard/casos/${caso.id}`}
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← Ver expediente
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Editar caso</h1>
          <p className="mt-1 font-mono text-sm text-slate-600">{caso.radicadoJudicial}</p>
          <p className="mt-1 text-sm text-slate-500">{caso.numeroCaso}</p>
        </div>
        {isAdmin && <DeleteCasoButton casoId={caso.id} />}
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
    </div>
  )
}
