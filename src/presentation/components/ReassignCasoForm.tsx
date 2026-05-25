'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { Profile } from '@/lib/auth/session'
import { assignCasoToStudentAction } from '@/app/(dashboard)/dashboard/admin/estudiantes/estudiantes-actions'
import type { ActionState } from '@/app/(dashboard)/dashboard/admin/estudiantes/estudiantes-actions'

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
    >
      {pending ? 'Guardando…' : 'Reasignar'}
    </button>
  )
}

export function ReassignCasoForm({
  casoId,
  currentStudentId,
  students,
  compact = false,
}: {
  casoId: string
  currentStudentId: string | null
  students: Profile[]
  compact?: boolean
}) {
  const [state, action] = useActionState(assignCasoToStudentAction, null as ActionState)

  return (
    <form action={action} className={compact ? 'flex flex-wrap items-end gap-2' : 'space-y-2'}>
      <input type="hidden" name="casoId" value={casoId} />
      <div className={compact ? 'min-w-[10rem] flex-1' : ''}>
        {!compact && (
          <label className="block text-xs font-medium text-app-secondary">
            Nuevo estudiante
          </label>
        )}
        <select
          name="studentId"
          defaultValue={currentStudentId ?? ''}
          className="mt-0.5 w-full rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text"
        >
          <option value="">— Sin asignar —</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </div>
      <SubmitBtn />
      {state && 'error' in state && (
        <p className="w-full text-xs text-red-600">{state.error}</p>
      )}
      {state && 'success' in state && (
        <p className="w-full text-xs text-emerald-700">Actualizado</p>
      )}
    </form>
  )
}
