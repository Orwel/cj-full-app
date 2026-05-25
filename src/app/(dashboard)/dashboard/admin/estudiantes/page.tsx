import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/auth/session'
import {
  listStudentsOverview,
  summarizeStudents,
  type StudentOverviewFilters,
} from '@/lib/analytics/students-overview'
import { EstudiantesFilters } from '@/presentation/components/EstudiantesFilters'
import { EstudiantesTable } from '@/presentation/components/EstudiantesTable'
import { EstudiantesMobileCards } from '@/presentation/components/EstudiantesMobileCards'
import { KpiCard } from '@/presentation/components/charts/KpiCard'
import { Button } from '@/presentation/components/ui/Button'

export default async function AdminEstudiantesPage({
  searchParams,
}: {
  searchParams: Promise<{
    role?: string
    estado?: string
    q?: string
  }>
}) {
  const profile = await getMyProfile()
  if (!profile) return null
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const sp = await searchParams
  const filters: StudentOverviewFilters = {
    role:
      sp.role === 'admin' || sp.role === 'student' ? sp.role : null,
    estado:
      sp.estado === 'con_casos' ||
      sp.estado === 'sin_casos' ||
      sp.estado === 'criticos' ||
      sp.estado === 'alertas'
        ? sp.estado
        : null,
    q: sp.q ?? null,
  }

  const rows = await listStudentsOverview(filters)
  const summary = summarizeStudents(rows)

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-app-text sm:text-2xl">Estudiantes</h1>
          <p className="mt-1 text-sm text-app-secondary">
            Gestión de perfiles, roles y asignación de casos. Solo administradores.
          </p>
        </div>
        <Button href="/dashboard/casos/new" variant="outline" className="w-full sm:w-auto">
          Nuevo caso
        </Button>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Perfiles"
          value={summary.total}
          href="/dashboard/admin/estudiantes"
          cta="Listado completo"
        />
        <KpiCard
          label="Estudiantes"
          value={summary.estudiantes}
          href="/dashboard/admin/estudiantes?role=student"
          cta="Filtrar estudiantes"
        />
        <KpiCard
          label="Con casos"
          value={summary.conCasos}
          href="/dashboard/admin/estudiantes?estado=con_casos"
          highlight={summary.sinCasos > 0}
          cta={`${summary.sinCasos} sin casos`}
        />
        <KpiCard
          label="Con alertas"
          value={summary.conAlertas}
          href="/dashboard/alertas?pendientes=1"
          cta="Ver alertas →"
          highlight={summary.conAlertas > 0}
        />
      </div>

      <EstudiantesFilters params={sp} />

      <EstudiantesMobileCards rows={rows} currentAdminId={profile.id} />
      <div className="mt-6">
        <EstudiantesTable rows={rows} currentAdminId={profile.id} />
      </div>
    </div>
  )
}
