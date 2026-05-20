import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDateTimeCo } from '@/lib/labels'

type QueueRow = {
  id: string
  caso_id: string
  job_type: string
  status: string
  attempts: number
  max_attempts: number
  last_error: string | null
  updated_at: string
  casos: { numero_caso: string; radicado_judicial: string } | null
}

const statusClass: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-900',
  running: 'bg-blue-50 text-blue-900',
  done: 'bg-emerald-50 text-emerald-900',
  failed: 'bg-red-50 text-red-900',
}

export async function SyncQueueTable({ days = 2 }: { days?: number }) {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days + 1)
  const sinceStr = since.toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('sync_queue')
    .select(
      `id, caso_id, job_type, status, attempts, max_attempts, last_error, updated_at,
       casos ( numero_caso, radicado_judicial )`,
    )
    .gte('scheduled_date', sinceStr)
    .order('updated_at', { ascending: false })
    .limit(40)

  if (error) {
    return <p className="text-sm text-red-600">{error.message}</p>
  }

  const rows = (data ?? []) as unknown as QueueRow[]

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-600">No hay trabajos en cola en los últimos {days} días.</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Caso</th>
            <th className="px-3 py-2 font-medium">Job</th>
            <th className="px-3 py-2 font-medium">Estado</th>
            <th className="px-3 py-2 font-medium">Intentos</th>
            <th className="px-3 py-2 font-medium">Actualizado</th>
            <th className="px-3 py-2 font-medium">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="px-3 py-2">
                {r.casos ? (
                  <Link
                    href={`/dashboard/casos/${r.caso_id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {r.casos.numero_caso}
                  </Link>
                ) : (
                  r.caso_id.slice(0, 8)
                )}
                {r.casos && (
                  <p className="font-mono text-xs text-slate-500">{r.casos.radicado_judicial}</p>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-700">{r.job_type}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[r.status] ?? 'bg-slate-100'}`}
                >
                  {r.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                {r.attempts}/{r.max_attempts}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
                {formatDateTimeCo(r.updated_at)}
              </td>
              <td className="max-w-xs px-3 py-2 text-xs text-red-700">
                {r.last_error ? r.last_error.slice(0, 120) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
