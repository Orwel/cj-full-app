import type { AlertaCardData } from '@/presentation/components/AlertaCard'

export type AlertasCasoGrupo = {
  caso_id: string
  caso: NonNullable<AlertaCardData['casos']>
  alertas: AlertaCardData[]
  pendientes: number
}

function consOf(a: AlertaCardData): number {
  return a.actuacion_alerta?.cons_actuacion ?? 0
}

export function sortAlertas(rows: AlertaCardData[], orden: string): AlertaCardData[] {
  const copy = [...rows]
  if (orden === 'termino') {
    copy.sort((a, b) => {
      const fa = a.actuacion_alerta?.fecha_fin_termino ?? '9999-12-31'
      const fb = b.actuacion_alerta?.fecha_fin_termino ?? '9999-12-31'
      if (fa !== fb) return fa.localeCompare(fb)
      return consOf(b) - consOf(a)
    })
    return copy
  }
  copy.sort((a, b) => {
    if (a.leida !== b.leida) return a.leida ? 1 : -1
    const rank = (t: string) =>
      t === 'critica' ? 0 : t === 'urgente' ? 1 : t === 'atencion' ? 2 : 3
    const dr = rank(a.tipo_alerta) - rank(b.tipo_alerta)
    if (dr !== 0) return dr
    const c = consOf(b) - consOf(a)
    if (c !== 0) return c
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
  return copy
}

export function groupAlertasPorCaso(rows: AlertaCardData[]): AlertasCasoGrupo[] {
  const map = new Map<string, AlertaCardData[]>()
  for (const r of rows) {
    const list = map.get(r.caso_id) ?? []
    list.push(r)
    map.set(r.caso_id, list)
  }

  const grupos: AlertasCasoGrupo[] = []
  for (const [caso_id, alertas] of map) {
    const caso = alertas[0]?.casos
    if (!caso) continue
    const sorted = [...alertas].sort((a, b) => consOf(b) - consOf(a))
    grupos.push({
      caso_id,
      caso,
      alertas: sorted,
      pendientes: sorted.filter((a) => !a.leida).length,
    })
  }

  grupos.sort((a, b) => {
    const maxA = consOf(a.alertas[0]!)
    const maxB = consOf(b.alertas[0]!)
    if (maxA !== maxB) return maxB - maxA
    if (a.pendientes !== b.pendientes) return b.pendientes - a.pendientes
    return a.caso.numero_caso.localeCompare(b.caso.numero_caso)
  })

  return grupos
}
