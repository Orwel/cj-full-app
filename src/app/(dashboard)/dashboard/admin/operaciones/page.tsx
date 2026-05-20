import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getMyProfile } from '@/lib/auth/session'
import { getOperationalHealth } from '@/lib/operations/health-summary'
import { getScrapingStats } from '@/lib/analytics/scraping-stats'
import { formatDateTimeCo } from '@/lib/labels'
import { SyncQueueTable } from '@/presentation/components/SyncQueueTable'
import { KpiCard } from '@/presentation/components/charts/KpiCard'
import { SyncQueueBar } from '@/presentation/components/charts/SyncQueueBar'
import { ScrapingLatencyLine } from '@/presentation/components/charts/ScrapingLatencyLine'
import { Card } from '@/presentation/components/ui/Card'
import { Table, TableBody, TableHead, TableShell, Td, Th } from '@/presentation/components/ui/Table'

export default async function AdminOperacionesPage() {
  const profile = await getMyProfile()
  if (!profile) return null
  if (profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const [health, scrapingStats] = await Promise.all([
    getOperationalHealth(),
    getScrapingStats(7),
  ])
  const q = health.syncQueueHoy
  const ok =
    health.staleCasos.length === 0 &&
    health.unreadCriticas.length === 0 &&
    q.failed === 0 &&
    q.running === 0

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-app-text">Operaciones y salud</h1>
      <p className="mt-1 text-sm text-app-secondary">
        Misma lógica que el cron{' '}
        <code className="rounded bg-slate-100 px-1 text-app-text">health-check</code> y la cola{' '}
        <code className="rounded bg-slate-100 px-1 text-app-text">sync_queue</code>. Solo
        administradores.
      </p>

      <Card
        variant="default"
        className={`mt-6 ${ok ? 'ring-2 ring-emerald-200' : 'ring-2 ring-amber-200'}`}
      >
        <p className={`text-sm font-semibold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>
          {ok ? 'Sistema operativo en buen estado' : 'Requiere atención'}
        </p>
        <p className="mt-1 text-sm text-app-secondary">
          {health.casosActivos} caso(s) con scraping activo · {health.alertasPendientes}{' '}
          alerta(s) pendientes · {health.casosEstadoCritico} caso(s) en estado crítico
        </p>
      </Card>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Sin sync OK (48h)"
          value={health.staleCasos.length}
          href="/dashboard/admin/operaciones"
          cta="Ver listado abajo"
          highlight={health.staleCasos.length > 0}
        />
        <KpiCard
          label="Críticas sin leer (+24h)"
          value={health.unreadCriticas.length}
          href="/dashboard/alertas?pendientes=1&severidad=critica"
          cta="Ver alertas →"
          highlight={health.unreadCriticas.length > 0}
        />
        <KpiCard
          label="Cola hoy · pending"
          value={q.pending}
          href="/dashboard/admin/operaciones"
          cta={`${q.done + q.pending + q.running + q.failed} trabajos hoy`}
          highlight={q.pending > 10}
        />
        <KpiCard
          label="Cola hoy · failed"
          value={q.failed}
          href="/dashboard/admin/operaciones"
          cta={q.running > 0 ? `${q.running} en running` : 'sync-tick cada 2 min'}
          highlight={q.failed > 0}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <SyncQueueBar queue={q} />
        <ScrapingLatencyLine data={scrapingStats.latencyByDay} />
      </div>

      {health.staleCasos.length > 0 && (
        <Card variant="default" className="mt-8 ring-1 ring-red-500/20">
          <h2 className="text-lg font-semibold text-red-700">
            Casos sin sincronización exitosa ({health.staleHours} h)
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {health.staleCasos.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline gap-2">
                <Link
                  href={`/dashboard/casos/${c.id}`}
                  className="font-medium text-brand-700 hover:text-brand-600"
                >
                  {c.numero_caso}
                </Link>
                <span className="font-mono text-app-secondary">{c.radicado_judicial}</span>
                {c.despacho && <span className="text-app-muted-text">· {c.despacho}</span>}
                <span className="text-xs text-app-muted-text">
                  Última sync: {formatDateTimeCo(c.fecha_ultimo_scraping)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {health.unreadCriticas.length > 0 && (
        <Card variant="default" className="mt-8 ring-1 ring-amber-500/20">
          <h2 className="text-lg font-semibold text-amber-700">
            Alertas críticas sin leer (&gt; {health.unreadCriticalHours} h)
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {health.unreadCriticas.map((a) => (
              <li key={a.id}>
                <Link
                  href="/dashboard/alertas?pendientes=1&severidad=critica"
                  className="font-medium text-brand-700 hover:text-brand-600"
                >
                  {a.numero_caso}
                </Link>
                <span className="text-app-secondary"> · {a.radicado_judicial}: </span>
                <span className="text-app-text">{a.titulo}</span>
                <span className="ml-2 text-xs text-app-muted-text">
                  {formatDateTimeCo(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card variant="default" className="mt-8">
        <h2 className="text-lg font-semibold text-app-text">Cola de sincronización (hoy)</h2>
        <p className="mt-1 text-sm text-app-secondary">
          done: {q.done} · pending: {q.pending} · running: {q.running} · failed: {q.failed}
        </p>
        <div className="mt-4">
          <SyncQueueTable days={1} />
        </div>
      </Card>

      <Card variant="default" className="mt-8">
        <h2 className="text-lg font-semibold text-app-text">Últimos scraping logs</h2>
        <TableShell className="mt-4">
          <Table>
            <TableHead>
              <tr>
                <Th>Caso</Th>
                <Th>Estado</Th>
                <Th>Nuevas</Th>
                <Th>Fecha</Th>
              </tr>
            </TableHead>
            <TableBody>
              {health.recentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <Td>
                    {log.caso_id ? (
                      <Link
                        href={`/dashboard/casos/${log.caso_id}`}
                        className="text-brand-700 hover:text-brand-600"
                      >
                        {log.numero_caso ?? log.radicado}
                      </Link>
                    ) : (
                      <span className="font-mono text-xs">{log.radicado}</span>
                    )}
                  </Td>
                  <Td>{log.status}</Td>
                  <Td>{log.actuaciones_nuevas ?? 0}</Td>
                  <Td className="text-xs text-app-muted-text">
                    {formatDateTimeCo(log.created_at)}
                  </Td>
                </tr>
              ))}
            </TableBody>
          </Table>
        </TableShell>
      </Card>

      <p className="mt-8 text-xs text-app-muted-text">
        Los crons <strong className="text-app-secondary">enqueue-daily</strong>,{' '}
        <strong className="text-app-secondary">sync-tick</strong> y{' '}
        <strong className="text-app-secondary">health-check</strong> ejecutan esta lógica en segundo
        plano.
      </p>
    </div>
  )
}
