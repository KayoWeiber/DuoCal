import type { PropsWithChildren } from 'react'

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      {children}
    </div>
  )
}
