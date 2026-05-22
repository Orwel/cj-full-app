import Link from 'next/link'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile, listStudentProfiles } from '@/lib/auth/session'
import type { Area } from '@/domain/entities/caso'
import { areaLabels, formatDateTimeCo } from '@/lib/labels'
import { parseSujetosProcesales } from '@/lib/sujetos-procesales'
import { CasosMobileCards } from '@/presentation/components/CasosMobileCards'
import { Button } from '@/presentation/components/ui/Button'
import {
  Table,
  TableBody,
  TableHead,
  TableShell,
  Td,
  Th,
} from '@/presentation/components/ui/Table'

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
          <h1 className="text-xl font-bold text-app-text sm:text-2xl">Casos</h1>
          <p className="mt-1 text-sm text-app-secondary">
            {isAdmin
              ? 'Todos los casos del consultorio'
              : 'Tus casos asignados'}
          </p>
        </div>
        <Button href="/dashboard/casos/new" className="w-full sm:w-auto">
          Nuevo caso
        </Button>
      </div>

      {isAdmin && (
        <div className="mt-6 flex flex-wrap gap-2 text-sm">
          <span className="self-center text-app-muted-text">Área:</span>
          <Link
            href="/dashboard/casos"
            className={`rounded-full px-3 py-1 ${!areaFilter ? 'bg-brand-700 text-white' : 'bg-slate-100 text-app-secondary hover:bg-slate-200'}`}
          >
            Todas
          </Link>
          {(Object.keys(areaLabels) as Area[]).map((a) => (
            <Link
              key={a}
              href={`/dashboard/casos?area=${a}`}
              className={`rounded-full px-3 py-1 ${areaFilter === a ? 'bg-brand-700 text-white' : 'bg-slate-100 text-app-secondary hover:bg-slate-200'}`}
            >
              {areaLabels[a]}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 md:hidden">
        <CasosMobileCards
          casos={casos}
          isAdmin={isAdmin}
          studentNameById={studentNameById}
        />
      </div>

      <TableShell className="mt-6 hidden md:block md:mt-8">
        <Table>
          <TableHead>
            <tr>
              <Th>Número</Th>
              <Th>Radicado</Th>
              <Th>Demandante</Th>
              <Th>Demandado</Th>
              <Th>Despacho</Th>
              <Th>Área</Th>
              <Th>Última sync</Th>
              {isAdmin && <Th>Estudiante</Th>}
              <Th />
            </tr>
          </TableHead>
          <TableBody>
            {casos.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 9 : 8}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No hay casos. Crea el primero.
                </td>
              </tr>
            ) : (
              casos.map((c) => {
                const { demandante, demandado } = parseSujetosProcesales(
                  c.sujetosProcesales,
                )
                return (
                <tr key={c.id} className="hover:bg-slate-50">
                  <Td className="font-medium">
                    {c.numeroCaso}
                    {c.estadoCritico && (
                      <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">
                        Crítico
                      </span>
                    )}
                  </Td>
                  <Td className="font-mono text-xs">
                    {c.radicadoJudicial}
                  </Td>
                  <Td className="max-w-[10rem]">
                    {demandante ? (
                      <span className="line-clamp-2" title={demandante}>
                        {demandante}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="max-w-[10rem]">
                    {demandado ? (
                      <span className="line-clamp-2" title={demandado}>
                        {demandado}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="max-w-[12rem] text-app-secondary">
                    <span className="line-clamp-2" title={c.despacho ?? undefined}>
                      {c.despacho ?? '—'}
                    </span>
                  </Td>
                  <Td>{areaLabels[c.area]}</Td>
                  <Td className="text-xs text-app-secondary">
                    {formatDateTimeCo(c.fechaUltimoScraping)}
                  </Td>
                  {isAdmin && (
                    <Td className="text-app-secondary">
                      {c.studentId
                        ? (studentNameById[c.studentId] ?? c.studentId.slice(0, 8) + '…')
                        : '—'}
                    </Td>
                  )}
                  <Td className="text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/dashboard/casos/${c.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/dashboard/casos/${c.id}/editar`}
                        className="font-medium text-slate-600 hover:underline"
                      >
                        Editar
                      </Link>
                    </div>
                  </Td>
                </tr>
              )})
            )}
          </TableBody>
        </Table>
      </TableShell>
    </div>
  )
}
