import { getAlertasByDay } from '@/lib/analytics/alertas-by-day'
import { getCasosByArea } from '@/lib/analytics/casos-by-area'
import { getActuacionesHeatmap } from '@/lib/analytics/actuaciones-heatmap'
import { getMyProfile } from '@/lib/auth/session'
import { SeverityAreaChart } from '@/presentation/components/charts/SeverityAreaChart'
import { AreaDonut } from '@/presentation/components/charts/AreaDonut'
import { ActivityHeatmap } from '@/presentation/components/charts/ActivityHeatmap'

export default async function EstadisticasPage() {
  const profile = await getMyProfile()
  if (!profile) return null

  const [alertasByDay, casosByArea, heatmap] = await Promise.all([
    getAlertasByDay(30),
    getCasosByArea(),
    getActuacionesHeatmap(12),
  ])

  return (
    <div>
      <h1 className="text-xl font-bold text-app-text sm:text-2xl">Estadísticas</h1>
      <p className="mt-1 text-app-secondary">
        Vista analítica del consultorio para {profile.full_name}.
      </p>

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
    </div>
  )
}
