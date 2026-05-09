import type { InputHTMLAttributes } from 'react'
import { cn } from '../../utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function Input({ className, id, label, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className={cn(
          'h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70',
          className,
        )}
        id={inputId}
        {...props}
      />
    </label>
  )
}
