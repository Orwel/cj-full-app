import { createClient } from '@/lib/supabase/server'

export type Profile = {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'student'
  is_active?: boolean
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
    .select('id, full_name, email, role, is_active, created_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return data as Profile
}

export async function listStudentProfiles(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, created_at')
    .eq('role', 'student')
    .eq('is_active', true)
    .order('full_name')

  if (error) throw new Error(error.message)
  return (data ?? []) as Profile[]
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, created_at')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return data as Profile
}
