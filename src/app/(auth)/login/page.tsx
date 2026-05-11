'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)
    if (signError) {
      setError(signError.message)
      return
    }
    // #region agent log
    const { data: sessWrap } = await supabase.auth.getSession()
    fetch('http://127.0.0.1:7716/ingest/ab1c510c-a543-42c1-965f-0afd9b8e866a', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '66ba1e',
      },
      body: JSON.stringify({
        sessionId: '66ba1e',
        hypothesisId: 'H1',
        location: 'login/page.tsx:afterSignIn',
        message: 'client session after signIn',
        data: { hasSession: Boolean(sessWrap.session), userIdLen: sessWrap.session?.user?.id?.length ?? 0 },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-slate-600">
        Consultorio — monitoreo judicial
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Correo
          </label>
          <input
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-600 focus:ring-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Contraseña
          </label>
          <input
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-600 focus:ring-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        ¿Sin cuenta?{' '}
        <Link href="/signup" className="font-medium text-blue-700 hover:underline">
          Registrarse
        </Link>
      </p>
    </div>
  )
}
