import type { PropsWithChildren } from 'react'

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <h1 className="text-lg font-semibold">DuoCal</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  )
}
