'use server'

import { revalidatePath } from 'next/cache'
import { getMyProfile, getSessionUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function marcarAlertaLeidaAction(alertaId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getSessionUser()
  const profile = await getMyProfile()
  if (!user || !profile) {
    return { ok: false, message: 'Sesión no válida.' }
  }

  const supabase = await createClient()
  const { data: alerta, error: e1 } = await supabase
    .from('alertas')
    .select('id, caso_id, actuacion_id')
    .eq('id', alertaId)
    .maybeSingle()

  if (e1 || !alerta) {
    return { ok: false, message: 'Alerta no encontrada.' }
  }

  const { error: e2 } = await supabase
    .from('alertas')
    .update({
      leida: true,
      leida_por: user.id,
      leida_at: new Date().toISOString(),
    })
    .eq('id', alertaId)

  if (e2) {
    return { ok: false, message: e2.message }
  }

  if (alerta.actuacion_id) {
    await supabase
      .from('actuaciones')
      .update({ es_nueva: false })
      .eq('id', alerta.actuacion_id)
  }

  revalidatePath('/dashboard/alertas')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/admin/operaciones')
  revalidatePath(`/dashboard/casos/${alerta.caso_id}`)
  revalidatePath(`/dashboard/casos/${alerta.caso_id}/editar`)
  return { ok: true }
}
