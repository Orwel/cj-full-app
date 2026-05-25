import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile, getProfileById, listStudentProfiles } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { formatDateTimeCo } from '@/lib/labels'
import { AssignUnassignedCasoForm } from '@/presentation/components/AssignUnassignedCasoForm'
import { BulkTransferCasosForm } from '@/presentation/components/BulkTransferCasosForm'
import { EstudianteCasosTable } from '@/presentation/components/EstudianteCasosTable'
import { StudentActiveToggle } from '@/presentation/components/StudentActiveToggle'
import { StudentRoleSelect } from '@/presentation/components/StudentRoleSelect'
import { Button } from '@/presentation/components/ui/Button'
import { Card } from '@/presentation/components/ui/Card'

export default async function AdminEstudianteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getMyProfile()
  if (!profile) return null
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const target = await getProfileById(id)
  if (!target) notFound()

  const ctx = await createCasosContext()
  const allCasos = await ctx.listCasos.execute()
  const casos = allCasos.filter((c) => c.studentId === id)
  const unassigned = allCasos.filter((c) => !c.studentId)
  const students = await listStudentProfiles()

  const supabase = await createClient()
  const { data: telegramRow } = await supabase
    .from('profiles')
    .select('telegram_chat_id, telegram_username, last_telegram_digest_at')
    .eq('id', id)
    .maybeSingle()

  const isSelf = profile.id === id
  const isActive = target.is_active !== false

  return (
    <div className="max-w-6xl">
      <Link
        href="/dashboard/admin/estudiantes"
        className="text-sm font-medium text-brand-700 hover:underline"
      >
        ← Volver a estudiantes
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text sm:text-2xl">{target.full_name}</h1>
          <p className="mt-1 text-sm text-app-secondary">{target.email}</p>
          <p className="mt-1 text-xs text-app-muted-text">
            Alta {formatDateTimeCo(target.created_at)} ·{' '}
            {isActive ? 'Perfil activo' : 'Perfil inactivo'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            href={`/dashboard/casos/new?studentId=${id}`}
            className="w-full sm:w-auto"
          >
            Crear caso
          </Button>
        </div>
      </div>

      <Card variant="default" className="mt-8">
        <h2 className="text-lg font-semibold text-app-text">Perfil y permisos</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-app-muted-text">
              Rol
            </dt>
            <dd className="mt-1">
              <StudentRoleSelect
                studentId={id}
                currentRole={target.role}
                disabled={isSelf}
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-app-muted-text">
              Estado del perfil
            </dt>
            <dd className="mt-1">
              <StudentActiveToggle
                studentId={id}
                isActive={isActive}
                disabled={isSelf}
              />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-app-muted-text">
              Telegram
            </dt>
            <dd className="mt-1 text-sm text-app-text">
              {telegramRow?.telegram_chat_id ? (
                <>
                  Vinculado
                  {telegramRow.telegram_username && (
                    <span className="text-app-secondary">
                      {' '}
                      @{telegramRow.telegram_username}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-app-secondary">No vinculado</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-app-muted-text">
              Casos asignados
            </dt>
            <dd className="mt-1 text-sm font-semibold text-app-text">{casos.length}</dd>
          </div>
        </dl>
      </Card>

      <Card variant="default" className="mt-8">
        <h2 className="text-lg font-semibold text-app-text">Asignar caso existente</h2>
        <p className="mt-1 text-sm text-app-secondary">
          Casos sin estudiante en el consultorio.
        </p>
        <div className="mt-4">
          <AssignUnassignedCasoForm studentId={id} unassignedCasos={unassigned} />
        </div>
      </Card>

      <Card variant="default" className="mt-8">
        <h2 className="text-lg font-semibold text-app-text">
          Casos activos ({casos.length})
        </h2>
        <p className="mt-1 text-sm text-app-secondary">
          Reasignar, editar o eliminar desde aquí. El detalle judicial está en cada
          expediente.
        </p>
        <div className="mt-4">
          <EstudianteCasosTable casos={casos} studentId={id} students={students} />
        </div>
      </Card>

      {!isSelf && casos.length > 0 && (
        <Card variant="default" className="mt-8 ring-1 ring-amber-500/20">
          <h2 className="text-lg font-semibold text-amber-800">Transferencia masiva</h2>
          <p className="mt-1 text-sm text-app-secondary">
            Mueve todos los casos de este estudiante a otro de un solo paso.
          </p>
          <div className="mt-4">
            <BulkTransferCasosForm
              fromStudentId={id}
              students={students}
              casosCount={casos.length}
            />
          </div>
        </Card>
      )}
    </div>
  )
}
