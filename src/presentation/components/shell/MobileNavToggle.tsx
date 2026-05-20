'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'

export function MobileNavToggle({ sidebar }: { sidebar: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm text-app-text"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        ☰
      </button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebar}
          </div>
        </div>
      )}
    </>
  )
}
