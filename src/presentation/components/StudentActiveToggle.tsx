'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateStudentActiveAction } from '@/app/(dashboard)/dashboard/admin/estudiantes/estudiantes-actions'
import type { ActionState } from '@/app/(dashboard)/dashboard/admin/estudiantes/estudiantes-actions'

function ToggleLabel({ isActive }: { isActive: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
          ? 'border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
          : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
      }`}
    >
      {pending ? '…' : isActive ? 'Inactivar' : 'Activar'}
    </button>
  )
}

export function StudentActiveToggle({
  studentId,
  isActive,
  disabled,
}: {
  studentId: string
  isActive: boolean
  disabled?: boolean
}) {
  const [state, action] = useActionState(
    updateStudentActiveAction.bind(null, studentId),
    null as ActionState,
  )

  const nextActive = !isActive

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          isActive &&
          !window.confirm(
            '¿Inactivar este perfil? No podrá asignarse nuevos casos (los casos actuales se mantienen).',
          )
        ) {
          e.preventDefault()
        }
      }}
    >
      <input type="hidden" name="isActive" value={String(nextActive)} />
      {disabled ? (
        <span className="text-sm text-app-muted-text">
          {isActive ? 'Activo' : 'Inactivo'}
        </span>
      ) : (
        <ToggleLabel isActive={isActive} />
      )}
      {state && 'error' in state && (
        <p className="mt-1 text-xs text-red-600">{state.error}</p>
      )}
    </form>
  )
}
