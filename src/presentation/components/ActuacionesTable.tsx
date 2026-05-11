import { createClient } from '@/lib/supabase/server'

type Row = {
  id: string
  fecha_actuacion: string
  cons_actuacion: number
  actuacion: string
  anotacion: string | null
  fecha_fin_termino: string | null
}

export async function ActuacionesTable({ casoId }: { casoId: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actuaciones')
    .select(
      'id, fecha_actuacion, cons_actuacion, actuacion, anotacion, fecha_fin_termino',
    )
    .eq('caso_id', casoId)
    .order('fecha_actuacion', { ascending: false })
    .order('cons_actuacion', { ascending: false })
    .limit(150)

  if (error) {
    return (
      <p className="text-sm text-red-600">
        No se pudieron cargar las actuaciones: {error.message}
      </p>
    )
  }

  const rows = (data ?? []) as Row[]

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Aún no hay actuaciones en base de datos. Usa «Sincronizar con Rama Judicial».
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Fecha</th>
            <th className="px-3 py-2 font-medium">Cons.</th>
            <th className="px-3 py-2 font-medium">Actuación</th>
            <th className="px-3 py-2 font-medium">Fin término</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                {r.fecha_actuacion}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                {r.cons_actuacion}
              </td>
              <td className="max-w-md px-3 py-2 text-slate-800">
                <div className="line-clamp-3">{r.actuacion.trim()}</div>
                {r.anotacion && (
                  <div className="mt-1 text-xs text-slate-500 line-clamp-2">
                    {r.anotacion}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                {r.fecha_fin_termino ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
