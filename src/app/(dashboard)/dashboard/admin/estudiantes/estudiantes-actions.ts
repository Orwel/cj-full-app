'use server'

import { revalidatePath } from 'next/cache'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile } from '@/lib/auth/session'
import { createServiceRoleClient } from '@/lib/supabase/admin'

export type ActionState = { error: string } | { success: true } | null

type AdminAuth =
  | { ok: false; message: string }
  | { ok: true; profile: NonNullable<Awaited<ReturnType<typeof getMyProfile>>> }

async function requireAdmin(): Promise<AdminAuth> {
  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') {
    return { ok: false, message: 'Solo administradores pueden realizar esta acción' }
  }
  return { ok: true, profile }
}

export async function updateStudentRoleAction(
  studentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.message }

  const newRole = formData.get('role')
  if (newRole !== 'admin' && newRole !== 'student') {
    return { error: 'Rol no válido' }
  }

  if (studentId === auth.profile.id && newRole === 'student') {
    return { error: 'No puedes quitarte el rol de administrador a ti mismo' }
  }

  const admin = createServiceRoleClient()
  const { error } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', studentId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/estudiantes')
  revalidatePath(`/dashboard/admin/estudiantes/${studentId}`)
  return { success: true }
}

export async function updateStudentActiveAction(
  studentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.message }

  if (studentId === auth.profile.id) {
    return { error: 'No puedes inactivar tu propia cuenta' }
  }

  const isActive = formData.get('isActive') === 'true'
  const admin = createServiceRoleClient()
  const { error } = await admin
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', studentId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/admin/estudiantes')
  revalidatePath(`/dashboard/admin/estudiantes/${studentId}`)
  return { success: true }
}

export async function assignCasoToStudentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.message }

  const casoId = String(formData.get('casoId') ?? '')
  const studentIdRaw = formData.get('studentId')
  const studentId =
    studentIdRaw && String(studentIdRaw).length > 0
      ? String(studentIdRaw)
      : null

  if (!casoId) return { error: 'Caso no válido' }

  try {
    const ctx = await createCasosContext()
    await ctx.updateCaso.execute(casoId, { studentId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al asignar'
    return { error: msg }
  }

  revalidatePath('/dashboard/casos')
  revalidatePath('/dashboard/admin/estudiantes')
  if (studentId) {
    revalidatePath(`/dashboard/admin/estudiantes/${studentId}`)
  }
  revalidatePath(`/dashboard/casos/${casoId}`)
  return { success: true }
}

export async function bulkTransferCasosAction(
  fromStudentId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdmin()
  if (!auth.ok) return { error: auth.message }

  const toStudentId = String(formData.get('toStudentId') ?? '')
  if (!toStudentId) return { error: 'Selecciona el estudiante destino' }
  if (toStudentId === fromStudentId) {
    return { error: 'El destino debe ser otro estudiante' }
  }

  const admin = createServiceRoleClient()
  const { error } = await admin
    .from('casos')
    .update({ student_id: toStudentId })
    .eq('student_id', fromStudentId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/casos')
  revalidatePath('/dashboard/admin/estudiantes')
  revalidatePath(`/dashboard/admin/estudiantes/${fromStudentId}`)
  revalidatePath(`/dashboard/admin/estudiantes/${toStudentId}`)
  return { success: true }
}
