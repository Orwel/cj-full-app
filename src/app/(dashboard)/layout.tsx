import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMyProfile, getSessionUser } from '@/lib/auth/session'
import { LogoutButton } from '@/presentation/components/LogoutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  // #region agent log
  fetch('http://127.0.0.1:7716/ingest/ab1c510c-a543-42c1-965f-0afd9b8e866a', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '66ba1e',
    },
    body: JSON.stringify({
      sessionId: '66ba1e',
      hypothesisId: 'H2',
      location: 'dashboard/layout.tsx:afterGetSessionUser',
      message: 'server session in dashboard layout',
      data: { hasUser: Boolean(user), userIdLen: user?.id?.length ?? 0 },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
  if (!user) {
    redirect('/login')
  }

  const profile = await getMyProfile()
  // #region agent log
  fetch('http://127.0.0.1:7716/ingest/ab1c510c-a543-42c1-965f-0afd9b8e866a', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': '66ba1e',
    },
    body: JSON.stringify({
      sessionId: '66ba1e',
      hypothesisId: 'H3',
      location: 'dashboard/layout.tsx:afterGetMyProfile',
      message: 'profile row for user',
      data: { hasProfile: Boolean(profile), role: profile?.role ?? null },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
  if (!profile) {
    redirect('/login')
  }

  const isAdmin = profile.role === 'admin'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-semibold text-slate-900">
              Consultorio
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link
                href="/dashboard/casos"
                className="text-slate-600 hover:text-slate-900"
              >
                Casos
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 sm:inline">
              {profile.full_name}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {isAdmin ? 'Admin' : 'Estudiante'}
              </span>
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  )
}
