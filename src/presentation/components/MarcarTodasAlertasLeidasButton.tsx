'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { marcarTodasAlertasLeidasAction } from '@/app/(dashboard)/dashboard/alertas/marcar-todas-alertas-leidas-action'

export function MarcarTodasAlertasLeidasButton({
  count,
  severidad,
}: {
  count: number
  severidad?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  if (count <= 0) return null

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const res = await marcarTodasAlertasLeidasAction({ severidad })
          if (res.ok) {
            router.refresh()
          }
        })
      }}
      className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
    >
      {pending ? 'Marcando…' : `Marcar todas como leídas (${count})`}
    </button>
  )
}
