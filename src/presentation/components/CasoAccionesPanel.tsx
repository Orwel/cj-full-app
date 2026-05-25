'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { sincronizarCasoJudicialAction } from '@/app/(dashboard)/dashboard/casos/sincronizar-caso-action'
import { toggleSuscripcionCasoAction } from '@/app/(dashboard)/dashboard/casos/[id]/suscripcion-action'
import {
  formatTelegramSyncHint,
  type TelegramSyncInfo,
} from '@/lib/telegram/sync-hints'

const btnBase =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

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

type Props = {
  casoId: string
  isAdmin: boolean
  isOwner: boolean
  adminSubscribed: boolean
  ownerHasTelegram?: boolean
}

export function CasoAccionesPanel({
  casoId,
  isAdmin,
  isOwner,
  adminSubscribed,
  ownerHasTelegram,
}: Props) {
  const router = useRouter()
  const [syncPending, startSync] = useTransition()
  const [subPending, startSub] = useTransition()
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [telegramWarn, setTelegramWarn] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  function runSync() {
    setSyncMessage(null)
    setTelegramWarn(null)
    setSyncError(null)
    startSync(async () => {
      const res = await sincronizarCasoJudicialAction(casoId)
      if (res.ok) {
        setSyncMessage(buildSyncMessage(res))
        const hint = res.telegram?.hint
        if (res.telegram?.channel === 'none' && hint) setTelegramWarn(hint)
        router.refresh()
      } else {
        setSyncError(res.message)
      }
    })
  }

  function toggleSubscribe() {
    startSub(async () => {
      const res = await toggleSuscripcionCasoAction(casoId, !adminSubscribed)
      if (res.ok) router.refresh()
    })
  }

  return (
    <aside className="w-full shrink-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:w-[min(100%,22rem)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Acciones
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runSync}
          disabled={syncPending}
          className={`${btnBase} bg-slate-900 text-white hover:bg-slate-800`}
        >
          {syncPending ? 'Sincronizando…' : 'Sincronizar Rama'}
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={toggleSubscribe}
            disabled={subPending}
            className={
              adminSubscribed
                ? `${btnBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`
                : `${btnBase} border border-brand-600 bg-brand-600 text-white hover:bg-brand-700`
            }
          >
            {subPending
              ? '…'
              : adminSubscribed
                ? 'Dejar de seguir'
                : 'Seguir en Telegram'}
          </button>
        )}
      </div>

      <Link
        href={`/dashboard/casos/${casoId}/editar`}
        className={`${btnBase} mt-2 w-full border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100`}
      >
        Editar datos del consultorio
      </Link>

      {(syncMessage || syncError || telegramWarn) && (
        <div className="mt-3 space-y-2">
          {syncMessage && (
            <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm leading-snug text-emerald-900">
              {syncMessage}
            </p>
          )}
          {telegramWarn && (
            <p
              className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-snug text-amber-900"
              role="status"
            >
              {telegramWarn}
            </p>
          )}
          {syncError && (
            <p
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm leading-snug text-red-800"
              role="alert"
            >
              {syncError}
            </p>
          )}
        </div>
      )}

      {isAdmin && (
        <p className="mt-3 text-xs leading-relaxed text-slate-600">
          {adminSubscribed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-800 ring-1 ring-brand-100">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden />
              Siguiendo alertas e informe diario en Telegram
            </span>
          ) : (
            <>
              Pulsa <strong className="font-medium text-slate-800">Seguir en Telegram</strong> para
              recibir alertas e informe diario de este caso (cuenta admin).
            </>
          )}
        </p>
      )}

      {isOwner && !isAdmin && (
        <p className="mt-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-950">
          Eres el estudiante dueño:{' '}
          <Link href="/dashboard/perfil" className="font-medium text-brand-700 hover:underline">
            conecta Telegram en Perfil
          </Link>{' '}
          para alertas automáticas.
          {ownerHasTelegram === false && ' (aún no vinculado)'}
          {ownerHasTelegram === true && ' (vinculado)'}
        </p>
      )}

      {!isAdmin && !isOwner && (
        <p className="mt-3 text-xs text-slate-500">
          Solo administradores pueden seguir casos ajenos.
        </p>
      )}

      <Link
        href="/dashboard/alertas?pendientes=1"
        className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
      >
        Ver alertas del consultorio →
      </Link>
    </aside>
  )
}
