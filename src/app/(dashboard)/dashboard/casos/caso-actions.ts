'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { casoFormSchema } from '@/application/casos/caso.schema'
import { createCasosContext } from '@/infrastructure/di'
import { createClient } from '@/lib/supabase/server'
import { getMyProfile } from '@/lib/auth/session'

export type ActionState = { error: string } | { success: true } | null

function formToObject(formData: FormData) {
  const studentRaw = formData.get('studentId')
  return {
    numeroCaso: String(formData.get('numeroCaso') ?? ''),
    radicadoJudicial: String(formData.get('radicadoJudicial') ?? '').replace(
      /\D/g,
      '',
    ),
    area: formData.get('area'),
    notas: (() => {
      const v = formData.get('notas')
      if (v === null || v === '') return null
      return String(v)
    })(),
    studentId:
      studentRaw && String(studentRaw).length > 0
        ? String(studentRaw)
        : null,
  }
}

export async function createCasoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await getMyProfile()
  if (!profile) return { error: 'No autenticado' }

  const raw = formToObject(formData)
  const parsed = casoFormSchema.safeParse({
    ...raw,
    area: raw.area,
  })

  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .join(' ')
    return { error: msg || 'Datos inválidos' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  let studentId: string | null = null
  if (profile.role === 'admin') {
    if (!parsed.data.studentId) {
      return { error: 'Selecciona el estudiante asignado' }
    }
    studentId = parsed.data.studentId
  } else {
    studentId = user.id
  }

  try {
    const ctx = await createCasosContext()
    await ctx.createCaso.execute({
      numeroCaso: parsed.data.numeroCaso.trim(),
      radicadoJudicial: parsed.data.radicadoJudicial,
      area: parsed.data.area,
      studentId,
      notas: parsed.data.notas ?? null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al crear'
    return { error: msg }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/casos')
  redirect('/dashboard/casos')
}

export async function updateCasoAction(
  casoId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const profile = await getMyProfile()
  if (!profile) return { error: 'No autenticado' }

  const raw = formToObject(formData)
  const parsed = casoFormSchema.safeParse({
    ...raw,
    area: raw.area,
  })

  if (!parsed.success) {
    const msg = Object.values(parsed.error.flatten().fieldErrors)
      .flat()
      .join(' ')
    return { error: msg || 'Datos inválidos' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const patch: {
    numeroCaso: string
    radicadoJudicial: string
    area: (typeof parsed.data)['area']
    notas: string | null
    studentId?: string | null
  } = {
    numeroCaso: parsed.data.numeroCaso.trim(),
    radicadoJudicial: parsed.data.radicadoJudicial,
    area: parsed.data.area,
    notas: parsed.data.notas ?? null,
  }

  if (profile.role === 'admin') {
    if (!parsed.data.studentId) {
      return { error: 'Selecciona el estudiante asignado' }
    }
    patch.studentId = parsed.data.studentId
  }

  try {
    const ctx = await createCasosContext()
    await ctx.updateCaso.execute(casoId, patch)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar'
    return { error: msg }
  }

  revalidatePath('/dashboard/casos')
  revalidatePath(`/dashboard/casos/${casoId}`)
  return { success: true }
}

export async function deleteCasoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const casoId = String(formData.get('casoId') ?? '')
  if (!casoId) return { error: 'Caso no válido' }

  const profile = await getMyProfile()
  if (!profile || profile.role !== 'admin') {
    return { error: 'Solo administradores pueden eliminar casos' }
  }

  try {
    const ctx = await createCasosContext()
    await ctx.deleteCaso.execute(casoId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al eliminar'
    return { error: msg }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/casos')
  redirect('/dashboard/casos')
}
