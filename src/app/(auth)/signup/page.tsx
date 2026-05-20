'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/presentation/components/ui/Button'
import { Input, Label } from '@/presentation/components/ui/Input'

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
      options: { data: { full_name: fullName } },
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
      <h1 className="text-xl font-bold text-app-text">Crear cuenta</h1>
      <p className="mt-1 text-sm text-app-secondary">Rol por defecto: estudiante</p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <Label>Nombre completo</Label>
          <Input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <Label>Correo</Label>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <Label>Contraseña</Label>
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
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
          <p className="text-sm text-app-secondary" role="status">
            {info}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full py-2.5">
          {loading ? 'Creando…' : 'Registrarse'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-app-secondary">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </div>
  )
}
