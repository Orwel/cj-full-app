'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton({
  variant = 'default',
}: {
  variant?: 'default' | 'sidebar'
}) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const className =
    variant === 'sidebar'
      ? 'shrink-0 rounded-md px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
      : 'rounded-lg border border-app-border px-3 py-1.5 text-sm text-app-secondary hover:bg-app-muted'

  return (
    <button type="button" onClick={handleLogout} className={className} title="Cerrar sesión">
      Salir
    </button>
  )
}
