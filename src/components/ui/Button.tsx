import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode
  isLoading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}

const variants = {
  primary: 'duocal-gradient duocal-soft-shadow text-white hover:brightness-[1.03]',
  secondary:
    'border border-[var(--duocal-border)] bg-white text-[var(--duocal-text)] shadow-[0_10px_26px_rgba(17,20,74,0.06)] hover:border-[rgba(84,102,241,0.35)]',
  ghost:
    'bg-transparent text-[var(--duocal-primary)] hover:bg-[rgba(84,102,241,0.08)]',
  danger: 'bg-[rgba(255,90,122,0.12)] text-[var(--duocal-danger)]',
}

export function Button({
  children,
  className,
  disabled,
  icon,
  isLoading = false,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-[20px] px-5 text-sm font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        className,
      )}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}
