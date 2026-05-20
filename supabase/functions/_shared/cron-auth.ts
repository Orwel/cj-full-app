export function assertCronAuth(req: Request): Response | null {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret) {
    return new Response('Falta CRON_SECRET en secrets de la función', { status: 503 })
  }
  const auth = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (auth !== secret) {
    return new Response('No autorizado', { status: 401 })
  }
  return null
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

export function createServiceAdmin() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
