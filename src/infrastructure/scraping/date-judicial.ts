/**
 * Normaliza fechas ISO de la API (`...T00:00:00`) a `YYYY-MM-DD` para columnas DATE.
 * @see docs/SCRAPING.md
 */
export function apiDateToSqlDate(isoOrDate: string | null | undefined): string | null {
  if (isoOrDate == null || isoOrDate === '') return null
  const s = String(isoOrDate).trim()
  const day = s.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day
  return null
}
