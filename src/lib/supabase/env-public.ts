/**
 * URL y anon key públicas de Supabase (middleware Edge, servidor, cliente).
 * La service_role no sustituye a la anon aquí.
 */
export function getPublicSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ''
  )
}

export function getPublicSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    ''
  )
}
