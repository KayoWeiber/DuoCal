import type { PropsWithChildren } from 'react'

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="duocal-app-shell text-(--duocal-text)">
      {children}
    </div>
  )
}
