'use client'

import { useFormState, useFormStatus } from 'react-dom'
import type { Area, Caso } from '@/domain/entities/caso'
import { AREAS } from '@/domain/entities/caso'
import type { Profile } from '@/lib/auth/session'
import type { ActionState } from '@/app/(dashboard)/dashboard/casos/caso-actions'

const areaLabels: Record<Area, string> = {
  civil: 'Civil',
  laboral: 'Laboral',
  penal: 'Penal',
  familia: 'Familia',
  administrativo: 'Administrativo',
}

function SubmitLabel({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus()
  return <>{isPending ? pending : idle}</>
}

type Props = {
  mode: 'create' | 'edit'
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  isAdmin: boolean
  students: Profile[]
  initial?: Caso | null
}

export function CasoForm({ mode, action, isAdmin, students, initial }: Props) {
  const [state, formAction] = useFormState(action, null)

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      {state && 'error' in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}
      {state && 'success' in state && state.success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          Guardado correctamente
        </p>
      )}

      <div>
        <label htmlFor="numeroCaso" className="block text-sm font-medium text-slate-700">
          Número interno del caso
        </label>
        <input
          id="numeroCaso"
          name="numeroCaso"
          required
          defaultValue={initial?.numeroCaso ?? ''}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-600 focus:ring-2"
        />
      </div>

      <div>
        <label htmlFor="radicadoJudicial" className="block text-sm font-medium text-slate-700">
          Radicado judicial (23 dígitos)
        </label>
        <input
          id="radicadoJudicial"
          name="radicadoJudicial"
          required
          inputMode="numeric"
          pattern="[0-9]{23}"
          maxLength={23}
          placeholder="Ej. 11001400300120230012345"
          defaultValue={initial?.radicadoJudicial ?? ''}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-slate-900 outline-none ring-blue-600 focus:ring-2"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-700">Área</span>
        <div className="mt-2 flex flex-wrap gap-3">
          {AREAS.map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name="area"
                value={a}
                required
                defaultChecked={
                  initial ? initial.area === a : a === 'civil'
                }
              />
              {areaLabels[a]}
            </label>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div>
          <label htmlFor="studentId" className="block text-sm font-medium text-slate-700">
            Estudiante asignado
          </label>
          <select
            id="studentId"
            name="studentId"
            required={isAdmin}
            defaultValue={initial?.studentId ?? ''}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-600 focus:ring-2"
          >
            <option value="">— Seleccionar —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.email})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="notas" className="block text-sm font-medium text-slate-700">
          Notas
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={3}
          defaultValue={initial?.notas ?? ''}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-600 focus:ring-2"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          <SubmitLabel
            idle={mode === 'create' ? 'Crear caso' : 'Guardar cambios'}
            pending={mode === 'create' ? 'Creando…' : 'Guardando…'}
          />
        </button>
      </div>
    </form>
  )
}
