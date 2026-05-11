import { createClient } from '@/lib/supabase/server'

export type Profile = {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'student'
  created_at: string
}

export async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('id', user.id)
    .maybeSingle()

  // #region agent log
  fetch('http://127.0.0.1:7716/ingest/ab1c510c-a543-42c1-965f-0afd9b8e866a', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '66ba1e',
    },
    body: JSON.stringify({
      sessionId: '66ba1e',
      hypothesisId: 'H3b',
      location: 'session.ts:getMyProfile',
      message: 'profiles query',
      data: {
        hasRow: Boolean(data),
        errCode: error?.code ?? null,
        errHint: error?.hint ? true : false,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion

  if (error || !data) return null
  return data as Profile
}

export async function listStudentProfiles(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('role', 'student')
    .order('full_name')

  if (error) throw new Error(error.message)
  return (data ?? []) as Profile[]
}
