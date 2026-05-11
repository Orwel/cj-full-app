import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from '@/lib/supabase/env-public'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

export async function createClient() {
  const cookieStore = await cookies()
  const url = getPublicSupabaseUrl()
  const anon = getPublicSupabaseAnonKey()
  if (!url || !anon) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY (o SUPABASE_URL / SUPABASE_ANON_KEY) en el entorno.',
    )
  }

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          /* set from Server Component — ignorar */
        }
      },
    },
  })
}
