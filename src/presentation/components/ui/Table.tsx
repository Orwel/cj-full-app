import type { ReactNode } from 'react'

export function TableShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`surface-card overflow-hidden rounded-xl ${className}`}>
      {children}
    </div>
  )
}

export function Table({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <table className={`min-w-full text-left text-sm ${className}`}>{children}</table>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-app-border bg-app-muted text-app-secondary">
      {children}
    </thead>
  )
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-app-border bg-app-surface">{children}</tbody>
}

export function Th({
  children,
  className = '',
}: {
  children?: ReactNode
  className?: string
}) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>
}

export function Td({
  children,
  className = '',
  colSpan,
}: {
  children?: ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td colSpan={colSpan} className={`px-4 py-3 text-app-text ${className}`}>
      {children}
    </td>
  )
}
