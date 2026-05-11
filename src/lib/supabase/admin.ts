import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con service role: solo en servidor (Server Actions / Route Handlers).
 * Necesario para escribir `actuaciones` y `scraping_logs` sin ampliar RLS.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para sincronizar con la Rama Judicial.',
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
