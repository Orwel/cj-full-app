import { createClient } from '@/lib/supabase/server'

export type StudentOverviewRow = {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'student'
  is_active: boolean
  created_at: string
  telegram_conectado: boolean
  last_telegram_digest_at: string | null
  casos_activos: number
  casos_criticos: number
  alertas_pendientes: number
}

export type StudentOverviewFilters = {
  role?: 'admin' | 'student' | null
  q?: string | null
  estado?: 'con_casos' | 'sin_casos' | 'criticos' | 'alertas' | null
}

export async function listStudentsOverview(
  filters: StudentOverviewFilters = {},
): Promise<StudentOverviewRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vw_students_overview')
    .select('*')
    .order('full_name')

  if (error) throw new Error(error.message)

  let rows = (data ?? []) as StudentOverviewRow[]

  if (filters.role) {
    rows = rows.filter((r) => r.role === filters.role)
  }

  if (filters.estado === 'con_casos') {
    rows = rows.filter((r) => r.casos_activos > 0)
  } else if (filters.estado === 'sin_casos') {
    rows = rows.filter((r) => r.casos_activos === 0)
  } else if (filters.estado === 'criticos') {
    rows = rows.filter((r) => r.casos_criticos > 0)
  } else if (filters.estado === 'alertas') {
    rows = rows.filter((r) => r.alertas_pendientes > 0)
  }

  const q = filters.q?.trim().toLowerCase()
  if (q) {
    rows = rows.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    )
  }

  return rows
}

export function summarizeStudents(rows: StudentOverviewRow[]) {
  const students = rows.filter((r) => r.role === 'student')
  return {
    total: rows.length,
    estudiantes: students.length,
    conCasos: students.filter((r) => r.casos_activos > 0).length,
    sinCasos: students.filter((r) => r.casos_activos === 0).length,
    conAlertas: students.filter((r) => r.alertas_pendientes > 0).length,
    inactivos: rows.filter((r) => !r.is_active).length,
  }
}
