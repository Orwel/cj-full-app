import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'outline'

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-700 text-white hover:bg-brand-600 focus:ring-2 focus:ring-brand-700/30 focus:ring-offset-2',
  ghost: 'text-app-secondary hover:bg-app-muted hover:text-app-text',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  outline:
    'border border-app-border bg-app-surface text-app-text hover:bg-app-muted',
}

type BaseProps = {
  variant?: Variant
  className?: string
  children: ReactNode
}

type ButtonProps = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: never }

type LinkButtonProps = BaseProps & {
  href: string
  disabled?: boolean
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonProps | LinkButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

  const classes = `${base} ${variants[variant]} ${className}`

  if ('href' in props && props.href) {
    const { href, disabled, ...rest } = props
    if (disabled) {
      return (
        <span className={`${classes} pointer-events-none opacity-50`}>{children}</span>
      )
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    )
  }

  const buttonProps = props as ButtonProps
  return (
    <button type="button" className={classes} {...buttonProps}>
      {children}
    </button>
  )
}
