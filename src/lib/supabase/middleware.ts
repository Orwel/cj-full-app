import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  getPublicSupabaseAnonKey,
  getPublicSupabaseUrl,
} from '@/lib/supabase/env-public'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

export async function updateSession(request: NextRequest) {
  const resolvedUrl = getPublicSupabaseUrl()
  const resolvedAnon = getPublicSupabaseAnonKey()

  let supabaseResponse = NextResponse.next({
    request,
  })

  if (!resolvedUrl || !resolvedAnon) {
    const soloServiceRole =
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) &&
      !resolvedAnon &&
      Boolean(resolvedUrl)
    const msg = soloServiceRole
      ? 'Supabase (middleware): falta NEXT_PUBLIC_SUPABASE_ANON_KEY. En Settings → API del proyecto hay dos claves: usa la "anon" "public" en NEXT_PUBLIC_SUPABASE_ANON_KEY; la service_role (SUPABASE_SERVICE_ROLE_KEY) es otra y no la sustituye en el navegador ni en el middleware.'
      : 'Supabase (middleware): faltan URL y/o clave anon. En .env.local define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (clave anon/public del panel API).'
    throw new Error(msg)
  }

  const supabase = createServerClient(resolvedUrl, resolvedAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        )
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  await supabase.auth.getUser()

  return supabaseResponse
}
