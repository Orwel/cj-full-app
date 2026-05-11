'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { deleteCasoAction } from '@/app/(dashboard)/dashboard/casos/caso-actions'

function PendingLabel() {
  const { pending } = useFormStatus()
  return <>{pending ? 'Eliminando…' : 'Eliminar caso'}</>
}

export function DeleteCasoButton({ casoId }: { casoId: string }) {
  const [state, action] = useFormState(deleteCasoAction, null)

  return (
    <form action={action} className="flex flex-col items-stretch gap-2 sm:items-end">
      <input type="hidden" name="casoId" value={casoId} />
      {state && 'error' in state && (
        <p className="text-right text-sm text-red-600">{state.error}</p>
      )}
      <button
        type="submit"
        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
      >
        <PendingLabel />
      </button>
    </form>
  )
}
