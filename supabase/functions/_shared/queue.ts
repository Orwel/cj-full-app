import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import type { ScrapingLogStatus } from './sync-caso.ts'
import { isPermanentScrapingFailure } from './sync-caso.ts'

/** Backoff: 5 min → 30 min → 2 h → 6 h → 24 h */
const BACKOFF_MS = [
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
  6 * 60 * 60_000,
  24 * 60 * 60_000,
]

export type SyncQueueRow = {
  id: string
  caso_id: string
  job_type: 'full_sync' | 'recalc_only'
  status: string
  attempts: number
  max_attempts: number
}

export function computeNextAttemptAt(attemptsAfterFailure: number): string {
  const idx = Math.min(Math.max(attemptsAfterFailure - 1, 0), BACKOFF_MS.length - 1)
  return new Date(Date.now() + BACKOFF_MS[idx]).toISOString()
}

export async function markQueueDone(
  admin: SupabaseClient,
  queueId: string,
): Promise<void> {
  const { error } = await admin
    .from('sync_queue')
    .update({ status: 'done', last_error: null, locked_at: null })
    .eq('id', queueId)
  if (error) throw new Error(error.message)
}

export async function markQueueFailed(
  admin: SupabaseClient,
  queueId: string,
  attempts: number,
  maxAttempts: number,
  lastError: string,
  permanent: boolean,
): Promise<void> {
  const nextAttempts = attempts + 1
  const exhausted = permanent || nextAttempts >= maxAttempts
  const patch: Record<string, unknown> = {
    status: exhausted ? 'failed' : 'pending',
    attempts: nextAttempts,
    last_error: lastError.slice(0, 2000),
    locked_at: null,
  }
  if (!exhausted) {
    patch.next_attempt_at = computeNextAttemptAt(nextAttempts)
  }
  const { error } = await admin.from('sync_queue').update(patch).eq('id', queueId)
  if (error) throw new Error(error.message)
}

export function shouldRetryScrapingStatus(status: ScrapingLogStatus): boolean {
  return !isPermanentScrapingFailure(status)
}
