/**
 * Recalcula severidad, estado_termino y estado_proceso de todos los casos.
 * Uso: npx tsx scripts/recalc-estados.ts
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { CasoJudicialSyncRepository } from '../src/infrastructure/database/supabase/caso-judicial-sync.repository'

function loadEnvLocal() {
  const path = join(process.cwd(), '.env.local')
  try {
    const text = readFileSync(path, 'utf8')
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    /* .env.local opcional si vars ya están en el entorno */
  }
}

async function main() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const repo = new CasoJudicialSyncRepository(admin)

  const { data: casos, error } = await admin.from('casos').select('id, numero_caso')
  if (error) throw error

  for (const c of casos ?? []) {
    await repo.recomputeSeverityAlertsAndEstadoCritico(c.id)
    console.log(`OK ${c.numero_caso} (${c.id})`)
  }
  console.log(`Recalculados ${casos?.length ?? 0} casos.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
