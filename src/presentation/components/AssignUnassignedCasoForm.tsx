'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { Caso } from '@/domain/entities/caso'
import { assignCasoToStudentAction } from '@/app/(dashboard)/dashboard/admin/estudiantes/estudiantes-actions'
import type { ActionState } from '@/app/(dashboard)/dashboard/admin/estudiantes/estudiantes-actions'

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
    >
      {pending ? 'Asignando…' : 'Asignar caso'}
    </button>
  )
}

export function AssignUnassignedCasoForm({
  studentId,
  unassignedCasos,
}: {
  studentId: string
  unassignedCasos: Caso[]
}) {
  const [state, action] = useActionState(assignCasoToStudentAction, null as ActionState)

  if (unassignedCasos.length === 0) {
    return (
      <p className="text-sm text-app-secondary">
        No hay casos sin estudiante asignado.
      </p>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="studentId" value={studentId} />
      <div className="min-w-0 flex-1">
        <label htmlFor="casoId" className="block text-sm font-medium text-app-text">
          Caso sin asignar
        </label>
        <select
          id="casoId"
          name="casoId"
          required
          className="mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
        >
          <option value="">— Seleccionar —</option>
          {unassignedCasos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.numeroCaso} · {c.radicadoJudicial}
            </option>
          ))}
        </select>
      </div>
      <SubmitBtn />
      {state && 'error' in state && (
        <p className="text-sm text-red-600 sm:basis-full">{state.error}</p>
      )}
    </form>
  )
}
