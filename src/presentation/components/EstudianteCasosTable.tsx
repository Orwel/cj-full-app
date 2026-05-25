import Link from 'next/link'
import type { Caso } from '@/domain/entities/caso'
import type { Profile } from '@/lib/auth/session'
import { areaLabels, formatDateTimeCo } from '@/lib/labels'
import { ReassignCasoForm } from '@/presentation/components/ReassignCasoForm'
import { DeleteCasoButton } from '@/presentation/components/DeleteCasoButton'
import {
  Table,
  TableBody,
  TableHead,
  TableShell,
  Td,
  Th,
} from '@/presentation/components/ui/Table'

export function EstudianteCasosTable({
  casos,
  studentId,
  students,
}: {
  casos: Caso[]
  studentId: string
  students: Profile[]
}) {
  if (casos.length === 0) {
    return (
      <p className="text-sm text-app-secondary">
        Este estudiante no tiene casos asignados.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-4 md:hidden">
        {casos.map((c) => (
          <div key={c.id} className="surface-card rounded-xl p-4">
            <Link href={`/dashboard/casos/${c.id}`} className="font-semibold text-brand-700">
              {c.numeroCaso}
            </Link>
            <p className="mt-0.5 font-mono text-xs text-app-secondary">{c.radicadoJudicial}</p>
            <p className="mt-2 text-xs text-app-secondary">
              {areaLabels[c.area]}
              {c.estadoCritico && (
                <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-red-800">
                  Crítico
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-app-muted-text">
              Sync {formatDateTimeCo(c.fechaUltimoScraping)}
            </p>
            <div className="mt-3 border-t border-app-border pt-3">
              <p className="mb-2 text-xs font-medium text-app-secondary">Reasignar</p>
              <ReassignCasoForm
                casoId={c.id}
                currentStudentId={studentId}
                students={students}
                compact
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <Link href={`/dashboard/casos/${c.id}`} className="text-brand-700">
                Ver
              </Link>
              <Link href={`/dashboard/casos/${c.id}/editar`} className="text-app-secondary">
                Editar
              </Link>
              <DeleteCasoButton casoId={c.id} />
            </div>
          </div>
        ))}
      </div>

      <TableShell className="hidden md:block">
        <Table>
          <TableHead>
            <tr>
              <Th>Número</Th>
              <Th>Radicado</Th>
              <Th>Área</Th>
              <Th>Última sync</Th>
              <Th>Reasignar</Th>
              <Th />
            </tr>
          </TableHead>
          <TableBody>
            {casos.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <Td className="font-medium">
                  {c.numeroCaso}
                  {c.estadoCritico && (
                    <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-800">
                      Crítico
                    </span>
                  )}
                </Td>
                <Td className="font-mono text-xs">{c.radicadoJudicial}</Td>
                <Td>{areaLabels[c.area]}</Td>
                <Td className="text-xs text-app-secondary">
                  {formatDateTimeCo(c.fechaUltimoScraping)}
                </Td>
                <Td className="min-w-[14rem]">
                  <ReassignCasoForm
                    casoId={c.id}
                    currentStudentId={studentId}
                    students={students}
                    compact
                  />
                </Td>
                <Td className="text-right">
                  <div className="flex flex-col items-end gap-2">
                    <Link
                      href={`/dashboard/casos/${c.id}`}
                      className="text-sm font-medium text-brand-700 hover:underline"
                    >
                      Ver
                    </Link>
                    <Link
                      href={`/dashboard/casos/${c.id}/editar`}
                      className="text-sm text-app-secondary hover:underline"
                    >
                      Editar
                    </Link>
                    <DeleteCasoButton casoId={c.id} />
                  </div>
                </Td>
              </tr>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </>
  )
}
