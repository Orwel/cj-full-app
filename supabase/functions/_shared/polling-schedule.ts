import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/** Programa la próxima sonda (RPC SQL; no bloquea el sync si falla). */
export async function scheduleNextCasoCheck(
  admin: SupabaseClient,
  casoId: string,
  hadMovement: boolean,
): Promise<void> {
  const { error } = await admin.rpc('schedule_next_caso_check', {
    p_caso_id: casoId,
    p_had_movement: hadMovement,
  })
  if (error) {
    console.error('schedule_next_caso_check:', error.message)
  }
}
