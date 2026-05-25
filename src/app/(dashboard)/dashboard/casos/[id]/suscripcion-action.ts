'use server'

import { revalidatePath } from 'next/cache'
import { getMyProfile, getSessionUser } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function toggleSuscripcionCasoAction(
  casoId: string,
  subscribe: boolean,
): Promise<{ ok: boolean; subscribed?: boolean; message?: string }> {
  const user = await getSessionUser()
  const profile = await getMyProfile()
  if (!user || !profile) {
    return { ok: false, message: 'Sesión no válida.' }
  }
  if (profile.role !== 'admin') {
    return { ok: false, message: 'Solo administradores pueden suscribirse a casos.' }
  }

  const supabase = await createClient()

  if (subscribe) {
    const { error } = await supabase.from('caso_suscriptores').upsert(
      { caso_id: casoId, profile_id: user.id },
      { onConflict: 'caso_id,profile_id' },
    )
    if (error) return { ok: false, message: error.message }
  } else {
    const { error } = await supabase
      .from('caso_suscriptores')
      .delete()
      .eq('caso_id', casoId)
      .eq('profile_id', user.id)
    if (error) return { ok: false, message: error.message }
  }

  revalidatePath(`/dashboard/casos/${casoId}`)
  return { ok: true, subscribed: subscribe }
}
