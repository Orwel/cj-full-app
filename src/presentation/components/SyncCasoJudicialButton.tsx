'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { sincronizarCasoJudicialAction } from '@/app/(dashboard)/dashboard/casos/sincronizar-caso-action'
import {
  formatTelegramSyncHint,
  type TelegramSyncInfo,
} from '@/lib/telegram/sync-hints'

function buildSyncMessage(res: {
  status: 'success' | 'no_changes'
  actuacionesNuevas: number
  telegram?: TelegramSyncInfo
}): string {
  const base =
    res.status === 'no_changes'
      ? 'Sin novedades: última actuación coincide con la consulta anterior.'
      : res.actuacionesNuevas > 0
        ? `Sincronizado. Actuaciones nuevas: ${res.actuacionesNuevas}.`
        : 'Sincronizado. No había actuaciones nuevas.'
  const tg = res.telegram ? formatTelegramSyncHint(res.telegram) : null
  return tg ? `${base} ${tg}` : base
}

const btnBase =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

/** Botón de sync aislado (el panel del caso usa CasoAccionesPanel). */
export function SyncCasoJudicialButton({ casoId }: { casoId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [telegramWarn, setTelegramWarn] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function runSync() {
    setMessage(null)
    setTelegramWarn(null)
    setError(null)
    startTransition(async () => {
      const res = await sincronizarCasoJudicialAction(casoId)
      if (res.ok) {
        setMessage(buildSyncMessage(res))
        const hint = res.telegram?.hint
        if (res.telegram?.channel === 'none' && hint) setTelegramWarn(hint)
        router.refresh()
      } else {
        setError(res.message)
      }
    })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={runSync}
        disabled={pending}
        className={`${btnBase} bg-slate-900 text-white hover:bg-slate-800`}
      >
        {pending ? 'Sincronizando…' : 'Sincronizar Rama'}
      </button>
      {message && (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      )}
      {telegramWarn && (
        <p className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          {telegramWarn}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
