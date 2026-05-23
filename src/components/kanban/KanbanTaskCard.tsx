import { Calendar, Flag, Tag, User } from 'lucide-react'
import type { StatusTarefa, TarefaKanban } from '../../hooks'

// ─── Configurações visuais dos status ────────────────────────────────────────

export const STATUS_CONFIG: Record<StatusTarefa, { label: string; cor: string; bg: string }> = {
  A_FAZER:      { label: 'A fazer',       cor: '#6B7280', bg: '#6B728015' },
  EM_ANDAMENTO: { label: 'Em andamento',  cor: '#F59E0B', bg: '#F59E0B15' },
  PLANEJADO:    { label: 'Planejado',     cor: '#5466F1', bg: '#5466F115' },
  CONCLUIDO:    { label: 'Concluído',     cor: '#10B981', bg: '#10B98115' },
}

export const PRIORIDADE_CONFIG = {
  BAIXA: { label: 'Baixa', cor: '#10B981' },
  MEDIA: { label: 'Média', cor: '#F59E0B' },
  ALTA:  { label: 'Alta',  cor: '#EF4444' },
}

// ─── Componente ───────────────────────────────────────────────────────────────

type KanbanTaskCardProps = {
  tarefa: TarefaKanban
  onClick: () => void
}

export function KanbanTaskCard({ tarefa, onClick }: KanbanTaskCardProps) {
  const status = STATUS_CONFIG[tarefa.status]
  const prioridade = PRIORIDADE_CONFIG[tarefa.prioridade]
  const categoriaColor = tarefa.cd_cor_categoria ?? '#5466F1'

  const dtPrazo = tarefa.dt_prazo ? new Date(tarefa.dt_prazo) : null
  const prazoVencido = dtPrazo && dtPrazo < new Date() && tarefa.status !== 'CONCLUIDO'

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[var(--duocal-border)] bg-white p-4 text-left transition active:scale-[0.98] active:opacity-80"
    >
      {/* Status + prioridade */}
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: status.bg, color: status.cor }}
        >
          {status.label}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <Flag className="size-3" style={{ color: prioridade.cor }} />
          <span className="text-[10px] font-semibold" style={{ color: prioridade.cor }}>
            {prioridade.label}
          </span>
        </span>
      </div>

      {/* Título */}
      <p
        className="text-sm font-bold leading-snug text-[var(--duocal-text)]"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {tarefa.titulo}
      </p>

      {/* Descrição (opcional) */}
      {tarefa.descricao && (
        <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--duocal-muted)]">
          {tarefa.descricao}
        </p>
      )}

      {/* Meta infos */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {tarefa.nm_categoria && (
          <span className="flex items-center gap-1">
            <Tag className="size-3" style={{ color: categoriaColor }} />
            <span className="text-[10px] font-medium" style={{ color: categoriaColor }}>
              {tarefa.nm_categoria}
            </span>
          </span>
        )}

        {tarefa.nm_responsavel && (
          <span className="flex items-center gap-1 text-[var(--duocal-muted)]">
            <User className="size-3" />
            <span className="text-[10px] font-medium">
              {tarefa.nm_responsavel.split(' ')[0]}
            </span>
          </span>
        )}

        {dtPrazo && (
          <span
            className="ml-auto flex items-center gap-1"
            style={{ color: prazoVencido ? '#EF4444' : 'var(--duocal-muted)' }}
          >
            <Calendar className="size-3" />
            <span className="text-[10px] font-medium">
              {dtPrazo.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </span>
          </span>
        )}
      </div>
    </button>
  )
}
