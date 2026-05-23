import { cn } from '../../utils'

const DIAS = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
]

type WeekDayPickerProps = {
  value: number[]
  onChange: (days: number[]) => void
}

export function WeekDayPicker({ value, onChange }: WeekDayPickerProps) {
  function toggle(day: number) {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day))
    } else {
      onChange([...value, day].sort((a, b) => a - b))
    }
  }

  return (
    <div className="flex w-full justify-between gap-1">
      {DIAS.map((dia) => {
        const selected = value.includes(dia.value)
        return (
          <button
            key={dia.value}
            type="button"
            onClick={() => toggle(dia.value)}
            className={cn(
              'flex h-10 flex-1 flex-col items-center justify-center rounded-2xl text-[11px] font-bold transition-all',
              selected
                ? 'text-white shadow-[0_4px_12px_rgba(84,102,241,0.28)]'
                : 'bg-(--duocal-surface-soft) text-(--duocal-muted)',
            )}
            style={
              selected
                ? { background: 'linear-gradient(135deg,#5466F1,#B66DFF)' }
                : undefined
            }
            aria-pressed={selected}
            aria-label={dia.label}
          >
            {dia.label}
          </button>
        )
      })}
    </div>
  )
}
