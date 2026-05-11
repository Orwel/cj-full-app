import { createBrowserClient } from '@supabase/ssr'
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from '@/lib/supabase/env-public'

export function createClient() {
  const url = getPublicSupabaseUrl()
  const anon = getPublicSupabaseAnonKey()
  if (!url || !anon) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en el entorno del navegador.',
    )
  }
  return createBrowserClient(url, anon)
}
