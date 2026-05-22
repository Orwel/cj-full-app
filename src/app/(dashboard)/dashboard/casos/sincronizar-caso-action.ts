'use server'

import { revalidatePath } from 'next/cache'
import {
  SincronizarCasoJudicialUseCase,
  type SincronizarCasoJudicialResult,
} from '@/application/scraping/sincronizar-caso-judicial.usecase'
import { CasoJudicialSyncRepository } from '@/infrastructure/database/supabase/caso-judicial-sync.repository'
import { RamaJudicialConsultaService } from '@/infrastructure/scraping/rama-judicial-consulta.service'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile, getSessionUser } from '@/lib/auth/session'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { dispatchPendingTelegramAlerts } from '@/lib/telegram/dispatch-pending-alerts'

export async function sincronizarCasoJudicialAction(
  casoId: string,
): Promise<SincronizarCasoJudicialResult> {
  const user = await getSessionUser()
  const profile = await getMyProfile()
  if (!user || !profile) {
    return {
      ok: false,
      status: 'error',
      message: 'Sesión no válida. Vuelve a iniciar sesión.',
    }
  }

  const ctx = await createCasosContext()
  const caso = await ctx.getCaso.execute(casoId)
  if (!caso) {
    return { ok: false, status: 'error', message: 'Caso no encontrado.' }
  }

  const puede =
    profile.role === 'admin' ||
    (caso.studentId != null && caso.studentId === user.id)

  if (!puede) {
    return {
      ok: false,
      status: 'error',
      message: 'No tienes permiso para sincronizar este caso.',
    }
  }

  try {
    const judicial = new RamaJudicialConsultaService()
    const admin = createServiceRoleClient()
    const sync = new CasoJudicialSyncRepository(admin)
    const uc = new SincronizarCasoJudicialUseCase(judicial, sync)
    const result = await uc.execute(caso)

    if (result.ok) {
      revalidatePath('/dashboard/casos')
      revalidatePath(`/dashboard/casos/${casoId}`)
      revalidatePath(`/dashboard/casos/${casoId}/editar`)
      revalidatePath('/dashboard')
      revalidatePath('/dashboard/alertas')

      let telegram
      try {
        telegram = await dispatchPendingTelegramAlerts(admin, { casoId })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error al enviar Telegram'
        console.error('[telegram] tras sync manual:', msg)
        telegram = {
          sent: 0,
          skipped: 0,
          channel: 'none' as const,
          hint: msg,
        }
      }

      return { ...result, telegram }
    }

    return result
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al sincronizar'
    return { ok: false, status: 'error', message: msg }
  }
}
