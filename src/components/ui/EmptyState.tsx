import type { ReactNode } from 'react'

type EmptyStateProps = {
  description?: string
  icon?: ReactNode
  title: string
}

export function EmptyState({ description, icon, title }: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-[rgba(229,231,240,0.72)] bg-(--duocal-surface-soft) px-4 py-4">
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-(--duocal-primary) shadow-[0_8px_20px_rgba(17,20,74,0.05)]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-(--duocal-text)">
            {title}
          </p>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-(--duocal-muted)">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
