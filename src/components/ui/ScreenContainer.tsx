import type { PropsWithChildren } from 'react'
import { cn } from '../../utils'

type ScreenContainerProps = PropsWithChildren<{
  className?: string
  withBottomNavigation?: boolean
}>

export function ScreenContainer({
  children,
  className,
  withBottomNavigation = false,
}: ScreenContainerProps) {
  return (
    <main
      className={cn(
        'duocal-ios-shell mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] text-[var(--duocal-text)]',
        withBottomNavigation
          ? 'pb-[calc(104px+env(safe-area-inset-bottom))]'
          : 'pb-8',
        className,
      )}
    >
      {children}
    </main>
  )
}
