import type { MembroWorkspace } from '../../hooks'
import { cn } from '../../utils'

type MemberPickerProps = {
  membros: MembroWorkspace[]
  value: string[]
  onChange: (ids: string[]) => void
}

export function MemberPicker({ membros, value, onChange }: MemberPickerProps) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {membros.map((membro) => {
        const selected = value.includes(membro.usuario_id)
        const iniciais = getIniciais(membro.nm_usuario)

        return (
          <button
            key={membro.usuario_id}
            type="button"
            onClick={() => toggle(membro.usuario_id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-all',
              selected
                ? 'bg-[rgba(84,102,241,0.12)] text-[var(--duocal-primary)] ring-2 ring-[var(--duocal-primary)] ring-offset-1'
                : 'bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)] hover:bg-[rgba(84,102,241,0.07)]',
            )}
          >
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-black text-white',
                selected ? 'bg-[var(--duocal-primary)]' : 'bg-[var(--duocal-muted)]',
              )}
            >
              {iniciais}
            </span>
            {membro.nm_usuario}
          </button>
        )
      })}

      {membros.length > 1 && (
        <button
          type="button"
          onClick={() => onChange(membros.map((m) => m.usuario_id))}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition-all',
            value.length === membros.length
              ? 'bg-[rgba(182,109,255,0.12)] text-[var(--duocal-violet)] ring-2 ring-[var(--duocal-violet)] ring-offset-1'
              : 'bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)] hover:bg-[rgba(182,109,255,0.07)]',
          )}
        >
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[var(--duocal-primary)] to-[var(--duocal-violet)] text-[10px] font-black text-white">
            ♥
          </span>
          Casal
        </button>
      )}
    </div>
  )
}

function getIniciais(nome: string | null) {
  if (!nome) return '?'

  const partes = nome.trim().split(/\s+/)

  if (partes.length >= 2) {
    return (partes[0][0] + partes[1][0]).toUpperCase()
  }

  return nome.slice(0, 2).toUpperCase()
}
