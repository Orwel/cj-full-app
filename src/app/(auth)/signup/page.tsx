'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    const supabase = createClient()
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })
    setLoading(false)
    if (signError) {
      setError(signError.message)
      return
    }
    if (data.session) {
      router.push('/dashboard')
      router.refresh()
      return
    }
    setInfo(
      'Revisa tu correo para confirmar la cuenta (si el proyecto Supabase tiene confirmación activada).',
    )
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Crear cuenta</h1>
      <p className="mt-1 text-sm text-slate-600">Rol por defecto: estudiante</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Nombre completo
          </label>
          <input
            type="text"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-600 focus:ring-2"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
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
            autoComplete="new-password"
            required
            minLength={6}
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
        {info && (
          <p className="text-sm text-slate-700" role="status">
            {info}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? 'Creando…' : 'Registrarse'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-blue-700 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  )
}
