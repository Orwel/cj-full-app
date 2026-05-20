import { createClient } from '@/lib/supabase/server'

export type SidebarCounters = {
  casosCount: number
  alertasPendientes: number
  casosCriticos: number
}

export async function getSidebarCounters(): Promise<SidebarCounters> {
  const supabase = await createClient()

  const [
    { count: casosCount },
    { count: alertasPendientes },
    { count: casosCriticos },
  ] = await Promise.all([
    supabase.from('casos').select('id', { count: 'exact', head: true }),
    supabase
      .from('alertas')
      .select('id', { count: 'exact', head: true })
      .eq('leida', false),
    supabase
      .from('casos')
      .select('id', { count: 'exact', head: true })
      .eq('estado_critico', true),
  ])

  return {
    casosCount: casosCount ?? 0,
    alertasPendientes: alertasPendientes ?? 0,
    casosCriticos: casosCriticos ?? 0,
  }
}
