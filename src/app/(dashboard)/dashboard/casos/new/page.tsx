import Link from 'next/link'
import { getMyProfile, listStudentProfiles } from '@/lib/auth/session'
import { CasoForm } from '@/presentation/components/CasoForm'
import { createCasoAction } from '../caso-actions'

export default async function NewCasoPage() {
  const profile = await getMyProfile()
  if (!profile) return null

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
      <h1 className="mt-4 text-2xl font-semibold text-slate-900">Nuevo caso</h1>
      <p className="mt-1 text-sm text-slate-600">
        Registra el número interno y el radicado de 23 dígitos. La sincronización con
        la API será en la siguiente fase.
      </p>

      {isAdmin && students.length === 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No hay perfiles con rol estudiante. Regístralos primero (Supabase Auth +
          trigger de perfil).
        </p>
      )}

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <CasoForm
          mode="create"
          action={createCasoAction}
          isAdmin={isAdmin}
          students={students}
        />
      </div>
    </div>
  )
}
