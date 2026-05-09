import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../utils'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode
  isLoading?: boolean
  variant?: 'primary' | 'secondary' | 'ghost'
}

const variants = {
  primary: 'bg-slate-950 text-white shadow-sm shadow-slate-950/20',
  secondary: 'border border-slate-200 bg-white text-slate-900 shadow-sm',
  ghost: 'bg-transparent text-slate-600',
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
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
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
