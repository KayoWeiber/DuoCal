import type { InputHTMLAttributes } from 'react'
import { cn } from '../../utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function Input({ className, id, label, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label

  return (
    <label className="block space-y-2" htmlFor={inputId}>
      <span className="text-sm font-semibold text-(--duocal-text)">
        {label}
      </span>
      <input
        className={cn(
          'duocal-input text-base',
          className,
        )}
        id={inputId}
        {...props}
      />
    </label>
  )
}
