/** Extrae demandante/demandado del texto `sujetosProcesales` de la API judicial. */
export function parseSujetosProcesales(text: string | null | undefined): {
  demandante: string | null
  demandado: string | null
  raw: string | null
} {
  const raw = text?.trim() || null
  if (!raw) {
    return { demandante: null, demandado: null, raw: null }
  }

  const pick = (re: RegExp): string | null => {
    const m = raw.match(re)
    return m?.[1]?.trim().replace(/\s+/g, ' ') || null
  }

  let demandante =
    pick(/(?:demandante|actor|parte\s+activa)\s*[:\-]\s*([^|;\n]+)/i) ??
    pick(/(?:demandante|actor)\s+([^|;\n]+?)(?:\s*\||\s+demandado|\s+vs\.?|$)/i)

  let demandado =
    pick(/(?:demandado|demandada|parte\s+pasiva|citad[oa])\s*[:\-]\s*([^|;\n]+)/i) ??
    pick(/(?:demandado|demandada)\s+([^|;\n]+)/i)

  const vs = raw.match(/^(.+?)\s+(?:vs\.?|c\/o|contra)\s+(.+)$/i)
  if (!demandante && vs) {
    demandante = vs[1].trim()
    demandado = demandado ?? vs[2].trim()
  }

  const parts = raw.split(/\s*\|\s*/).filter(Boolean)
  const isDemandadoLabel = (s: string) =>
    /^(demandado|demandada|parte\s+pasiva|citad[oa])/i.test(s)
  const isDemandanteLabel = (s: string) =>
    /^(demandante|actor|parte\s+activa)/i.test(s)
  const stripDemandantePrefix = (s: string) =>
    s.replace(/^(demandante|actor|parte\s+activa)\s*[:\-]\s*/i, '').trim()
  const stripDemandadoPrefix = (s: string) =>
    s.replace(/^(demandado|demandada|parte\s+pasiva|citad[oa])\s*[:\-]\s*/i, '').trim()

  if (parts.length >= 1 && parts[0].length < 120) {
    const first = parts[0].trim()
    if (!demandante && !demandado && isDemandadoLabel(first)) {
      demandado = stripDemandadoPrefix(first) || null
    } else if (!demandante && !isDemandadoLabel(first)) {
      demandante = stripDemandantePrefix(first) || first
    } else if (!demandado && isDemandadoLabel(first)) {
      demandado = stripDemandadoPrefix(first) || null
    }
  }
  if (parts.length >= 2 && parts[1].length < 120) {
    const second = parts[1].trim()
    if (!demandado && !isDemandanteLabel(second)) {
      demandado = stripDemandadoPrefix(second) || second
    } else if (!demandante && isDemandanteLabel(second)) {
      demandante = stripDemandantePrefix(second) || null
    }
  }

  return { demandante, demandado, raw }
}
