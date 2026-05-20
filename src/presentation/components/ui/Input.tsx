import type { InputHTMLAttributes } from 'react'

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`mt-1 w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none placeholder:text-app-muted-text focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20 ${className}`}
      {...props}
    />
  )
}

export function Label({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block text-sm font-medium text-app-secondary ${className}`}>
      {children}
    </label>
  )
}
