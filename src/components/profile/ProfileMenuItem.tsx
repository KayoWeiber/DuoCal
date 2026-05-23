import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

type Props = {
  icon: ReactNode
  iconBg: string
  label: string
  sublabel?: string
  onClick?: () => void
}

export function ProfileMenuItem({ icon, iconBg, label, sublabel, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-(--duocal-surface-soft) active:bg-(--duocal-surface-soft)"
    >
      <div
        className="grid size-9 shrink-0 place-items-center rounded-[14px]"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-(--duocal-text)">{label}</p>
        {sublabel ? (
          <p className="truncate text-xs text-(--duocal-muted)">{sublabel}</p>
        ) : null}
      </div>
      <ChevronRight className="size-4 shrink-0 text-(--duocal-border)" />
    </button>
  )
}
