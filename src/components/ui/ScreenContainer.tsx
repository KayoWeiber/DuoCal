import type { PropsWithChildren } from 'react'
import { cn } from '../../utils'

type ScreenContainerProps = PropsWithChildren<{
  className?: string
}>

export function ScreenContainer({ children, className }: ScreenContainerProps) {
  return (
    <main
      className={cn(
        'mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-slate-50 px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-slate-950',
        className,
      )}
    >
      {children}
    </main>
  )
}
