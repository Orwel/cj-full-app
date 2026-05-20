'use server'

import { revalidatePath } from 'next/cache'
import { getMyProfile, getSessionUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function marcarTodasAlertasLeidasAction(options?: {
  severidad?: string
}): Promise<{ ok: boolean; count?: number; message?: string }> {
  const user = await getSessionUser()
  const profile = await getMyProfile()
  if (!user || !profile) {
    return { ok: false, message: 'Sesión no válida.' }
  }

  const supabase = await createClient()
  let query = supabase
    .from('alertas')
    .select('id, caso_id, actuacion_id')
    .eq('leida', false)

  const severidad = options?.severidad
  if (severidad && severidad !== 'todas') {
    query = query.eq('tipo_alerta', severidad)
  }

  const { data: rows, error: e1 } = await query

  if (e1) {
    return { ok: false, message: e1.message }
  }

  const pendientes = rows ?? []
  if (pendientes.length === 0) {
    return { ok: true, count: 0 }
  }

  const ids = pendientes.map((r) => r.id)
  const now = new Date().toISOString()

  const { error: e2 } = await supabase
    .from('alertas')
    .update({
      leida: true,
      leida_por: user.id,
      leida_at: now,
    })
    .in('id', ids)

  if (e2) {
    return { ok: false, message: e2.message }
  }

  const actuacionIds = [
    ...new Set(
      pendientes.map((r) => r.actuacion_id).filter((id): id is string => Boolean(id)),
    ),
  ]

  if (actuacionIds.length > 0) {
    await supabase.from('actuaciones').update({ es_nueva: false }).in('id', actuacionIds)
  }

  revalidatePath('/dashboard/alertas')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/admin/operaciones')

  const casoIds = [...new Set(pendientes.map((r) => r.caso_id))]
  for (const casoId of casoIds) {
    revalidatePath(`/dashboard/casos/${casoId}`)
    revalidatePath(`/dashboard/casos/${casoId}/editar`)
  }

  return { ok: true, count: pendientes.length }
}
