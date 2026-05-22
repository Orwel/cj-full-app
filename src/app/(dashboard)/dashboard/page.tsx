import Link from 'next/link'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getAlertasByDay } from '@/lib/analytics/alertas-by-day'
import { getCasosByArea } from '@/lib/analytics/casos-by-area'
import { getActuacionesHeatmap } from '@/lib/analytics/actuaciones-heatmap'
import { KpiCard } from '@/presentation/components/charts/KpiCard'
import { SeverityAreaChart } from '@/presentation/components/charts/SeverityAreaChart'
import { AreaDonut } from '@/presentation/components/charts/AreaDonut'
import { ActivityHeatmap } from '@/presentation/components/charts/ActivityHeatmap'
import { Card } from '@/presentation/components/ui/Card'
import { formatDateTimeCo } from '@/lib/labels'
import { getMyTelegramState } from '@/lib/telegram/profile.server'

export default async function DashboardHomePage() {
  const profile = await getMyProfile()
  if (!profile) return null

  const ctx = await createCasosContext()
  const casos = await ctx.listCasos.execute()
  const supabase = await createClient()

  const [{ count: alertasPendientes }, alertasByDay, casosByArea, heatmap] =
    await Promise.all([
      supabase
        .from('alertas')
        .select('id', { count: 'exact', head: true })
        .eq('leida', false),
      getAlertasByDay(30),
      getCasosByArea(),
      getActuacionesHeatmap(8),
    ])

  const criticos = casos.filter((c) => c.estadoCritico).length
  const isAdmin = profile.role === 'admin'
  const telegram = await getMyTelegramState(profile.id)
  const recientes = [...casos]
    .sort((a, b) => {
      const ta = a.fechaUltimoScraping
        ? new Date(a.fechaUltimoScraping).getTime()
        : 0
      const tb = b.fechaUltimoScraping
        ? new Date(b.fechaUltimoScraping).getTime()
        : 0
      return tb - ta
    })
    .slice(0, 5)

  return (
    <>
      <div>
        <h1 className="text-xl font-bold text-app-text sm:text-2xl">Panel</h1>
        <p className="mt-1 text-app-secondary">
          Hola, {profile.full_name}. Resumen del monitoreo judicial.
        </p>
      </div>

      {!telegram.linked && (
        <Card variant="brand" className="mt-6">
          <h2 className="font-semibold text-brand-800">Conecta Telegram</h2>
          <p className="mt-1 text-sm text-brand-800/90">
            Recibe alertas inmediatas de tus procesos y un resumen diario. Tarda menos de un
            minuto.
          </p>
          <Link
            href="/dashboard/perfil"
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
          >
            Ir a Perfil y conectar →
          </Link>
        </Card>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Casos registrados"
          value={casos.length}
          href="/dashboard/casos"
          cta="Ver listado →"
        />
        <KpiCard
          label="Actuaciones sin leer"
          value={alertasPendientes ?? 0}
          href="/dashboard/alertas?pendientes=1"
          cta="Ver actualizaciones →"
          highlight={(alertasPendientes ?? 0) > 0}
        />
        <KpiCard
          label="Casos en estado crítico"
          value={criticos}
          href="/dashboard/alertas?severidad=critica"
          cta="Ver críticas →"
          highlight={criticos > 0}
        />
        <KpiCard
          label="Con scraping activo"
          value={casos.filter((c) => c.scrapingActivo).length}
          href="/dashboard/casos"
          cta="Ver casos →"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <SeverityAreaChart data={alertasByDay} />
        </div>
        <div className="lg:col-span-4">
          <AreaDonut data={casosByArea} />
        </div>
        <div className="lg:col-span-12">
          <ActivityHeatmap data={heatmap} />
        </div>
      </div>

      {recientes.length > 0 && (
        <Card variant="default" className="mt-8">
          <h2 className="text-lg font-semibold text-app-text">Actividad reciente</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {recientes.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-app-border py-2 last:border-0"
              >
                <Link
                  href={`/dashboard/casos/${c.id}`}
                  className="font-medium text-brand-700 hover:text-brand-600"
                >
                  {c.numeroCaso}
                </Link>
                <span className="font-mono text-xs text-app-secondary">
                  {c.radicadoJudicial}
                </span>
                <span className="text-xs text-app-muted-text">
                  {formatDateTimeCo(c.fechaUltimoScraping)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isAdmin && (
        <Card variant="brand" className="mt-8">
          <h2 className="font-semibold text-brand-800">Administración</h2>
          <p className="mt-1 text-sm text-brand-800/80">
            Salud del sistema, cola de sincronización y mismos indicadores que el
            cron health-check.
          </p>
          <Link
            href="/dashboard/admin/operaciones"
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
          >
            Operaciones y salud →
          </Link>
        </Card>
      )}

      <Card variant="muted" className="mt-8 text-sm text-app-secondary">
        <p className="font-medium text-app-text">Sincronización automática</p>
        <p className="mt-2">
          Los casos activos se encolan cada madrugada y se procesan con{' '}
          <code className="rounded bg-slate-200 px-1 text-app-text">sync-tick</code> cada
          2 minutos. También puedes sincronizar manualmente desde la ficha de cada caso.
        </p>
      </Card>
    </>
  )
}
