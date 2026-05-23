import { CalendarDays, Check, Circle, Flag, Tag, UserRound } from 'lucide-react'
import type { TarefaKanban } from '../../hooks'
import { PRIORIDADE_CONFIG, STATUS_CONFIG } from './kanbanConfig'

type KanbanTaskCardProps = {
  tarefa: TarefaKanban
  onOpen: () => void
  onToggleDone: () => void
}

export function KanbanTaskCard({ tarefa, onOpen, onToggleDone }: KanbanTaskCardProps) {
  const status = STATUS_CONFIG[tarefa.status]
  const prioridade = PRIORIDADE_CONFIG[tarefa.prioridade]
  const categoriaColor = tarefa.cd_cor_categoria ?? status.cor
  const concluida = tarefa.status === 'CONCLUIDO'

  return (
    <article
      className="relative overflow-hidden rounded-3xl border border-[rgba(229,231,240,0.92)] bg-white shadow-[0_10px_28px_rgba(17,20,74,0.06)]"
      style={{ borderLeft: `3px solid ${categoriaColor}` }}
    >
      <div className="flex items-start gap-3 px-3.5 py-3">
        <button
          type="button"
          onClick={onToggleDone}
          aria-label={concluida ? 'Marcar tarefa como aberta' : 'Marcar tarefa como concluída'}
          className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border transition active:scale-95"
          style={{
            borderColor: concluida ? status.cor : 'var(--duocal-border)',
            backgroundColor: concluida ? status.cor : '#fff',
            color: concluida ? '#fff' : 'var(--duocal-muted)',
          }}
        >
          {concluida ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
            {tarefa.nm_categoria ? (
              <span
                className="inline-flex min-w-0 max-w-[9rem] items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black"
                style={{ backgroundColor: `${categoriaColor}18`, color: categoriaColor }}
              >
                <Tag className="size-2.5 shrink-0" />
                <span className="truncate">{tarefa.nm_categoria}</span>
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black"
                style={{ backgroundColor: status.bg, color: status.cor }}
              >
                {status.label}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 break-words text-[13px] font-black leading-snug text-(--duocal-text)">
            {tarefa.titulo}
          </h3>

          {tarefa.descricao ? (
            <p className="mt-1 line-clamp-1 break-words text-[11px] leading-4 text-(--duocal-muted)">
              {tarefa.descricao}
            </p>
          ) : null}

          <div className="mt-2.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] font-semibold text-(--duocal-muted)">
            {tarefa.nm_responsavel ? (
              <span className="inline-flex min-w-0 max-w-[7rem] items-center gap-1">
                <UserRound className="size-3 shrink-0" />
                <span className="truncate">{primeiroNome(tarefa.nm_responsavel)}</span>
              </span>
            ) : null}

            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3 shrink-0" />
              {formatarPrazo(tarefa.dt_prazo)}
            </span>

            <span className="inline-flex items-center gap-1" style={{ color: prioridade.cor }}>
              <Flag className="size-3 shrink-0" />
              {prioridade.label}
            </span>
          </div>
        </button>

        <span
          className="mt-1 size-2 shrink-0 rounded-full"
          style={{ backgroundColor: status.cor }}
          aria-hidden="true"
        />
      </div>
    </article>
  )
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome
}

function formatarPrazo(value: string | null): string {
  if (!value) return 'Sem prazo'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sem prazo'

  const hoje = new Date()
  const amanha = new Date(hoje)
  amanha.setDate(hoje.getDate() + 1)

  if (isSameDay(date, hoje)) return 'Hoje'
  if (isSameDay(date, amanha)) return 'Amanhã'

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  )
}
