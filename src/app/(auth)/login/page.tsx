'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/presentation/components/ui/Button'
import { Input, Label } from '@/presentation/components/ui/Input'

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
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-app-text">Iniciar sesión</h1>
      <p className="mt-1 text-sm text-app-secondary">
        Consultorio — monitoreo judicial
      </p>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={loading} className="w-full py-2.5">
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-app-secondary">
        ¿Sin cuenta?{' '}
        <Link href="/signup" className="font-medium text-brand-700 hover:underline">
          Registrarse
        </Link>
      </p>
    </div>
  )
}
