export type ActuacionResumen = {
  id: string
  cons_actuacion: number
  fecha_actuacion: string
  actuacion: string
  anotacion: string | null
  fecha_inicio_termino: string | null
  fecha_fin_termino: string | null
  fecha_registro: string | null
  con_documentos: boolean
  severidad: string
  estado_termino?: string
  es_nueva?: boolean
}

/** Supabase a veces devuelve relación FK como objeto o como array de un elemento. */
export function normalizeActuacionJoin(
  value: unknown,
  actuacionId: string | null,
): ActuacionResumen | null {
  if (!value) return null
  if (Array.isArray(value)) {
    if (actuacionId) {
      const found = value.find(
        (a) => a && typeof a === 'object' && 'id' in a && (a as { id: string }).id === actuacionId,
      )
      if (found) return found as ActuacionResumen
    }
    return (value[0] as ActuacionResumen) ?? null
  }
  return value as ActuacionResumen
}

export type ActuacionConCaso = ActuacionResumen & { caso_id: string }

export function groupUltimasPorCaso(
  rows: ActuacionConCaso[],
  porCaso = 5,
): Map<string, ActuacionResumen[]> {
  const map = new Map<string, ActuacionResumen[]>()
  const sorted = [...rows].sort((a, b) => {
    if (b.cons_actuacion !== a.cons_actuacion) {
      return b.cons_actuacion - a.cons_actuacion
    }
    return b.fecha_actuacion.localeCompare(a.fecha_actuacion)
  })

  for (const row of sorted) {
    const list = map.get(row.caso_id) ?? []
    if (list.length >= porCaso) continue
    list.push(row)
    map.set(row.caso_id, list)
  }
  return map
}

/** Plazo vigente más próximo entre actuaciones (para contexto en alertas). */
export function plazoMasProximo(
  actuaciones: ActuacionResumen[],
): ActuacionResumen | null {
  const conPlazo = actuaciones.filter((a) => a.fecha_fin_termino)
  if (conPlazo.length === 0) return null
  conPlazo.sort((a, b) =>
    (a.fecha_fin_termino ?? '').localeCompare(b.fecha_fin_termino ?? ''),
  )
  return conPlazo[0]
}
