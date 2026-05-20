import { createClient } from '@/lib/supabase/server'
import { SeverityBadge } from '@/presentation/components/SeverityBadge'
import { formatFechaCo, diasHasta } from '@/lib/labels'

type Row = {
  id: string
  fecha_actuacion: string
  cons_actuacion: number
  actuacion: string
  anotacion: string | null
  fecha_inicio_termino: string | null
  fecha_fin_termino: string | null
  con_documentos: boolean
  severidad: string
}

export async function ActuacionesTable({
  casoId,
  limit = 150,
  showInicioTermino = false,
  showDocumentos = false,
}: {
  casoId: string
  limit?: number
  showInicioTermino?: boolean
  showDocumentos?: boolean
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('actuaciones')
    .select(
      `id, fecha_actuacion, cons_actuacion, actuacion, anotacion,
       fecha_inicio_termino, fecha_fin_termino, con_documentos, severidad`,
    )
    .eq('caso_id', casoId)
    .order('cons_actuacion', { ascending: false })
    .order('fecha_actuacion', { ascending: false })
    .limit(limit)

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

  const maxCons = rows[0]?.cons_actuacion ?? 0

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-3 py-2 font-medium">Cons.</th>
            <th className="px-3 py-2 font-medium">Fecha</th>
            <th className="px-3 py-2 font-medium">Actuación</th>
            {showInicioTermino && (
              <th className="px-3 py-2 font-medium">Inicio término</th>
            )}
            <th className="px-3 py-2 font-medium">Fin término</th>
            {showDocumentos && <th className="px-3 py-2 font-medium">Docs.</th>}
            <th className="px-3 py-2 font-medium">Severidad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const dias = diasHasta(r.fecha_fin_termino)
            const esUltima = r.cons_actuacion === maxCons
            return (
              <tr
                key={r.id}
                id={`actuacion-${r.cons_actuacion}`}
                className={`scroll-mt-24 align-top ${esUltima ? 'bg-blue-50/40' : ''}`}
              >
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="font-semibold tabular-nums text-slate-900">
                    {r.cons_actuacion}
                  </span>
                  {esUltima && (
                    <span className="ml-1 rounded bg-blue-100 px-1 text-xs text-blue-800">
                      última
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                  {formatFechaCo(r.fecha_actuacion)}
                </td>
                <td className="max-w-lg px-3 py-2 text-slate-800">
                  <div className="whitespace-pre-wrap">{r.actuacion.trim()}</div>
                  {r.anotacion && (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">
                      {r.anotacion}
                    </p>
                  )}
                </td>
                {showInicioTermino && (
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {formatFechaCo(r.fecha_inicio_termino)}
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                  {formatFechaCo(r.fecha_fin_termino)}
                  {dias !== null && r.fecha_fin_termino && (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {dias < 0 ? `Vencido ${Math.abs(dias)}d` : dias === 0 ? 'Hoy' : `${dias}d`}
                    </span>
                  )}
                </td>
                {showDocumentos && (
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {r.con_documentos ? 'Sí' : 'No'}
                  </td>
                )}
                <td className="whitespace-nowrap px-3 py-2">
                  <SeverityBadge severidad={r.severidad} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
