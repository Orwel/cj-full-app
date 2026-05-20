import Link from 'next/link'
import { getOperationalHealth } from '@/lib/operations/health-summary'

export async function SystemStatusWidget({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2.5 text-xs text-zinc-400">
        Monitoreo judicial Rama Judicial
      </div>
    )
  }

  const health = await getOperationalHealth()
  const q = health.syncQueueHoy
  const ok =
    health.staleCasos.length === 0 &&
    health.unreadCriticas.length === 0 &&
    q.failed === 0

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2.5 text-xs">
      <p className={`font-medium ${ok ? 'text-emerald-400' : 'text-amber-400'}`}>
        {ok ? 'Sistema operativo' : 'Requiere atención'}
      </p>
      <p className="mt-1 text-zinc-500">
        Cola: {q.pending} pend. · {q.done} ok
      </p>
      <Link
        href="/dashboard/admin/operaciones"
        className="mt-1.5 inline-block font-medium text-zinc-300 hover:text-white"
      >
        Operaciones →
      </Link>
    </div>
  )
}
