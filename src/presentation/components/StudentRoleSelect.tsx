'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { updateStudentRoleAction } from '@/app/(dashboard)/dashboard/admin/estudiantes/estudiantes-actions'
import type { ActionState } from '@/app/(dashboard)/dashboard/admin/estudiantes/estudiantes-actions'

function RoleSubmit() {
  const { pending } = useFormStatus()
  return (
    <span className="sr-only">{pending ? 'Guardando rol…' : 'Guardar rol'}</span>
  )
}

export function StudentRoleSelect({
  studentId,
  currentRole,
  disabled,
}: {
  studentId: string
  currentRole: 'admin' | 'student'
  disabled?: boolean
}) {
  const [state, action] = useActionState(
    updateStudentRoleAction.bind(null, studentId),
    null as ActionState,
  )

  return (
    <form action={action} className="inline-flex flex-col gap-1">
      <select
        name="role"
        defaultValue={currentRole}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value as 'admin' | 'student'
          if (
            next === 'student' &&
            !window.confirm(
              '¿Cambiar a estudiante? Perderá acceso de administrador.',
            )
          ) {
            e.target.value = currentRole
            return
          }
          if (
            next === 'admin' &&
            !window.confirm('¿Otorgar rol de administrador a este usuario?')
          ) {
            e.target.value = currentRole
            return
          }
          e.target.form?.requestSubmit()
        }}
        className="rounded-lg border border-app-border bg-app-surface px-2 py-1 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-700/30"
      >
        <option value="student">Estudiante</option>
        <option value="admin">Administrador</option>
      </select>
      <RoleSubmit />
      {state && 'error' in state && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </form>
  )
}
