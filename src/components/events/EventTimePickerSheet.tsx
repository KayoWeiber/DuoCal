import { useState, useEffect, useRef } from 'react'
import { cn } from '../../utils'

type Props = {
  title: string
  value: string // HH:MM
  onConfirm: (time: string) => void
  onClose: () => void
}

const TIMES: string[] = []
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIMES.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
}

export function EventTimePickerSheet({ title, value, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState(value || '09:00')
  const listRef = useRef<HTMLDivElement>(null)
  const selRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    selRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(17,20,74,0.36)] backdrop-blur-sm">
      <div className="w-full max-w-[430px] rounded-t-[32px] bg-white shadow-[0_-16px_60px_rgba(17,20,74,0.14)]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-[var(--duocal-border)]" />
        </div>

        <h3 className="px-5 pb-3 text-center text-lg font-bold text-[var(--duocal-text)]">
          {title}
        </h3>

        {/* Time list */}
        <div ref={listRef} className="max-h-56 overflow-y-auto px-5 pb-2 space-y-1">
          {TIMES.map((t) => {
            const sel = t === selected
            return (
              <button
                key={t}
                ref={sel ? selRef : undefined}
                type="button"
                onClick={() => setSelected(t)}
                className={cn(
                  'w-full rounded-2xl px-4 py-3 text-center text-base font-semibold transition-all',
                  sel
                    ? 'text-white shadow-md'
                    : 'text-[var(--duocal-text)] hover:bg-[var(--duocal-surface-soft)]',
                )}
                style={
                  sel
                    ? { background: 'linear-gradient(135deg, #5466F1 0%, #B66DFF 100%)' }
                    : undefined
                }
              >
                {t}
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-[var(--duocal-border)] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-[var(--duocal-border)] py-3 text-sm font-semibold text-[var(--duocal-muted)] transition hover:bg-[var(--duocal-surface-soft)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold text-white transition"
            style={{ background: 'linear-gradient(135deg, #5466F1 0%, #B66DFF 100%)' }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
