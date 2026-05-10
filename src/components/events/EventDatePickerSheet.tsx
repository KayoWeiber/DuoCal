import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../utils'

type Props = {
  value: string // YYYY-MM-DD
  onConfirm: (date: string) => void
  onClose: () => void
}

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function EventDatePickerSheet({ value, onConfirm, onClose }: Props) {
  const initial = value ? parseLocalDate(value) : new Date()
  const [selected, setSelected] = useState<Date>(initial)
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0) }
    else setViewMonth((m) => m + 1)
  }

  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function isSel(day: number) {
    return (
      selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
    )
  }

  function isToday(day: number) {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(17,20,74,0.36)] backdrop-blur-sm">
      <div className="w-full max-w-[430px] rounded-t-[32px] bg-white shadow-[0_-16px_60px_rgba(17,20,74,0.14)]">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-[var(--duocal-border)]" />
        </div>

        <h3 className="px-5 pb-4 text-center text-lg font-bold text-[var(--duocal-text)]">
          Selecionar data
        </h3>

        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 pb-3">
          <button
            type="button"
            onClick={prevMonth}
            className="grid size-9 place-items-center rounded-2xl bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)] transition hover:bg-[rgba(84,102,241,0.08)] hover:text-[var(--duocal-primary)]"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-base font-bold text-[var(--duocal-text)]">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            className="grid size-9 place-items-center rounded-2xl bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)] transition hover:bg-[rgba(84,102,241,0.08)] hover:text-[var(--duocal-primary)]"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Week headers */}
        <div className="grid grid-cols-7 px-3 pb-1">
          {WEEK_DAYS.map((d) => (
            <div
              key={d}
              className="py-1 text-center text-[11px] font-semibold text-[var(--duocal-muted)]"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 px-3 pb-4">
          {cells.map((day, i) =>
            day === null ? (
              <div key={`e-${i}`} />
            ) : (
              <button
                key={`${viewYear}-${viewMonth}-${day}`}
                type="button"
                onClick={() => setSelected(new Date(viewYear, viewMonth, day))}
                className={cn(
                  'mx-auto flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-all',
                  isSel(day)
                    ? 'text-white shadow-md'
                    : isToday(day)
                    ? 'bg-[rgba(84,102,241,0.10)] text-[var(--duocal-primary)]'
                    : 'text-[var(--duocal-text)] hover:bg-[var(--duocal-surface-soft)]',
                )}
                style={
                  isSel(day)
                    ? { background: 'linear-gradient(135deg, #5466F1 0%, #B66DFF 100%)' }
                    : undefined
                }
              >
                {day}
              </button>
            ),
          )}
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
            onClick={() => onConfirm(toISO(selected))}
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
