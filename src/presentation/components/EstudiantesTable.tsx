import Link from 'next/link'
import type { StudentOverviewRow } from '@/lib/analytics/students-overview'
import { formatDateTimeCo } from '@/lib/labels'
import { StudentRoleSelect } from '@/presentation/components/StudentRoleSelect'
import {
  Table,
  TableBody,
  TableHead,
  TableShell,
  Td,
  Th,
} from '@/presentation/components/ui/Table'

export function EstudiantesTable({
  rows,
  currentAdminId,
}: {
  rows: StudentOverviewRow[]
  currentAdminId: string
}) {
  return (
    <TableShell className="hidden md:block">
      <Table>
        <TableHead>
          <tr>
            <Th>Estudiante</Th>
            <Th>Rol</Th>
            <Th>Casos</Th>
            <Th>Críticos</Th>
            <Th>Alertas</Th>
            <Th>Telegram</Th>
            <Th>Estado</Th>
            <Th />
          </tr>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <tr>
              <Td colSpan={8} className="text-center text-app-muted-text">
                No hay perfiles que coincidan con el filtro.
              </Td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <Td>
                  <div>
                    <p className="font-medium text-app-text">{r.full_name}</p>
                    <p className="text-xs text-app-secondary">{r.email}</p>
                  </div>
                </Td>
                <Td>
                  <StudentRoleSelect
                    studentId={r.id}
                    currentRole={r.role}
                    disabled={r.id === currentAdminId}
                  />
                </Td>
                <Td>{r.casos_activos}</Td>
                <Td>
                  {r.casos_criticos > 0 ? (
                    <span className="font-medium text-red-700">{r.casos_criticos}</span>
                  ) : (
                    '0'
                  )}
                </Td>
                <Td>
                  {r.alertas_pendientes > 0 ? (
                    <span className="font-medium text-amber-700">
                      {r.alertas_pendientes}
                    </span>
                  ) : (
                    '0'
                  )}
                </Td>
                <Td className="text-xs">
                  {r.telegram_conectado ? (
                    <span className="text-emerald-700">Vinculado</span>
                  ) : (
                    <span className="text-app-muted-text">No</span>
                  )}
                  {r.last_telegram_digest_at && (
                    <p className="mt-0.5 text-app-muted-text">
                      Digest {formatDateTimeCo(r.last_telegram_digest_at)}
                    </p>
                  )}
                </Td>
                <Td>
                  {r.is_active ? (
                    <span className="text-emerald-700">Activo</span>
                  ) : (
                    <span className="text-amber-700">Inactivo</span>
                  )}
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/dashboard/admin/estudiantes/${r.id}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    Ver
                  </Link>
                </Td>
              </tr>
            ))
          )}
        </TableBody>
      </Table>
    </TableShell>
  )
}
