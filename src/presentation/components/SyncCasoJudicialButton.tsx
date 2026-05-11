'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { sincronizarCasoJudicialAction } from '@/app/(dashboard)/dashboard/casos/sincronizar-caso-action'

export function SyncCasoJudicialButton({ casoId }: { casoId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function runSync() {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const res = await sincronizarCasoJudicialAction(casoId)
      if (res.ok) {
        if (res.status === 'no_changes') {
          setMessage('Sin novedades: última actuación coincide con la consulta anterior.')
        } else {
          setMessage(
            res.actuacionesNuevas > 0
              ? `Sincronizado. Actuaciones nuevas: ${res.actuacionesNuevas}.`
              : 'Sincronizado. No había actuaciones nuevas.',
          )
        }
        router.refresh()
      } else {
        setError(res.message)
      }
    })
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        type="button"
        onClick={runSync}
        disabled={pending}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? 'Sincronizando…' : 'Sincronizar con Rama Judicial'}
      </button>
      {message && (
        <p className="max-w-sm text-right text-sm text-emerald-800">{message}</p>
      )}
      {error && (
        <p className="max-w-sm text-right text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
