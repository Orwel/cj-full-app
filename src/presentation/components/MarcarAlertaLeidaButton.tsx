'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { marcarAlertaLeidaAction } from '@/app/(dashboard)/dashboard/alertas/marcar-alerta-leida-action'

export function MarcarAlertaLeidaButton({ alertaId }: { alertaId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const res = await marcarAlertaLeidaAction(alertaId)
          if (res.ok) router.refresh()
        })
      }}
      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
    >
      {pending ? '…' : 'Marcar leída'}
    </button>
  )
}
