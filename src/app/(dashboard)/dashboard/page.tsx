import Link from 'next/link'
import { createCasosContext } from '@/infrastructure/di'
import { getMyProfile } from '@/lib/auth/session'

export default async function DashboardHomePage() {
  const profile = await getMyProfile()
  const ctx = await createCasosContext()
  const casos = await ctx.listCasos.execute()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Panel</h1>
      <p className="mt-1 text-slate-600">
        Hola, {profile?.full_name}. Aquí verás el resumen del monitoreo judicial.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Casos registrados</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{casos.length}</p>
          <Link
            href="/dashboard/casos"
            className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
          >
            Ver listado →
          </Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Siguiente paso (Fase 2)</p>
          <p className="mt-2 text-sm text-slate-600">
            Sincronizar radicado con la API de la Rama Judicial y persistir actuaciones.
          </p>
        </div>
      </div>
    </div>
  )
}
