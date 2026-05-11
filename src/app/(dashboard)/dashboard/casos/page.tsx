import Link from 'next/link'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile, listStudentProfiles } from '@/lib/auth/session'
import type { Area } from '@/domain/entities/caso'

const areaLabels: Record<Area, string> = {
  civil: 'Civil',
  laboral: 'Laboral',
  penal: 'Penal',
  familia: 'Familia',
  administrativo: 'Administrativo',
}

export default async function CasosListPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>
}) {
  const profile = await getMyProfile()
  if (!profile) return null

  const sp = await searchParams
  const areaFilter =
    profile.role === 'admin' &&
    sp.area &&
    ['civil', 'laboral', 'penal', 'familia', 'administrativo'].includes(sp.area)
      ? (sp.area as Area)
      : null

  const ctx = await createCasosContext()
  let casos = await ctx.listCasos.execute()
  if (areaFilter) {
    casos = casos.filter((c) => c.area === areaFilter)
  }

  const isAdmin = profile.role === 'admin'
  const students = isAdmin ? await listStudentProfiles() : []
  const studentNameById = Object.fromEntries(
    students.map((s) => [s.id, s.full_name]),
  )

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Casos</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isAdmin
              ? 'Todos los casos del consultorio'
              : 'Tus casos asignados'}
          </p>
        </div>
        <Link
          href="/dashboard/casos/new"
          className="inline-flex justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          Nuevo caso
        </Link>
      </div>

      {isAdmin && (
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <span className="self-center text-slate-500">Área:</span>
          <Link
            href="/dashboard/casos"
            className={`rounded-full px-3 py-1 ${!areaFilter ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
          >
            Todas
          </Link>
          {(Object.keys(areaLabels) as Area[]).map((a) => (
            <Link
              key={a}
              href={`/dashboard/casos?area=${a}`}
              className={`rounded-full px-3 py-1 ${areaFilter === a ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
            >
              {areaLabels[a]}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Número</th>
              <th className="px-4 py-3 font-medium">Radicado</th>
              <th className="px-4 py-3 font-medium">Área</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Estudiante</th>}
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {casos.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 5 : 4}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No hay casos. Crea el primero.
                </td>
              </tr>
            ) : (
              casos.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.numeroCaso}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">
                    {c.radicadoJudicial}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {areaLabels[c.area]}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-slate-600">
                      {c.studentId
                        ? (studentNameById[c.studentId] ?? c.studentId.slice(0, 8) + '…')
                        : '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/casos/${c.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      Ver / editar
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
