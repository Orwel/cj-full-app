'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { Profile } from '@/lib/auth/session'
import { bulkTransferCasosAction } from '@/app/(dashboard)/dashboard/admin/estudiantes/estudiantes-actions'
import type { ActionState } from '@/app/(dashboard)/dashboard/admin/estudiantes/estudiantes-actions'

function SubmitBtn({ casosCount }: { casosCount: number }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || casosCount === 0}
      className="rounded-lg border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text hover:bg-app-muted disabled:opacity-50"
    >
      {pending ? 'Transfiriendo…' : 'Transferir todos los casos'}
    </button>
  )
}

export function BulkTransferCasosForm({
  fromStudentId,
  students,
  casosCount,
}: {
  fromStudentId: string
  students: Profile[]
  casosCount: number
}) {
  const [state, action] = useActionState(
    bulkTransferCasosAction.bind(null, fromStudentId),
    null as ActionState,
  )

  const targets = students.filter((s) => s.id !== fromStudentId)

  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(e) => {
        if (
          casosCount > 0 &&
          !window.confirm(
            `¿Transferir ${casosCount} caso(s) al estudiante seleccionado?`,
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <div>
        <label htmlFor="toStudentId" className="block text-sm font-medium text-app-text">
          Transferir todos los casos a
        </label>
        <select
          id="toStudentId"
          name="toStudentId"
          required
          disabled={casosCount === 0 || targets.length === 0}
          className="mt-1 w-full max-w-md rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm"
        >
          <option value="">— Seleccionar —</option>
          {targets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </div>
      <SubmitBtn casosCount={casosCount} />
      {state && 'error' in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && 'success' in state && (
        <p className="text-sm text-emerald-700">Casos transferidos correctamente</p>
      )}
    </form>
  )
}
