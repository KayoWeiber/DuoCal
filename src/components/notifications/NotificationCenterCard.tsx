import { Bell } from 'lucide-react'
import type { SolicitacaoWorkspacePendente } from '../../hooks'
import { EmptyState } from '../ui/EmptyState'
import { NotificationRequestCard } from './NotificationRequestCard'

type NotificationCenterCardProps = {
  isLoading: boolean
  isResponding: boolean
  onResponder: (solicitacaoId: string, aceitar: boolean) => void
  solicitacoes: SolicitacaoWorkspacePendente[]
}

export function NotificationCenterCard({
  isLoading,
  isResponding,
  onResponder,
  solicitacoes,
}: NotificationCenterCardProps) {
  return (
    <section className="duocal-card p-5 shadow-[0_16px_42px_rgba(17,20,74,0.07)]">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-[20px] bg-[rgba(84,102,241,0.10)] text-[var(--duocal-primary)]">
          <Bell className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-black text-[var(--duocal-text)]">
            Central de notificações
          </h2>
          <p className="text-sm leading-5 text-[var(--duocal-muted)]">
            Solicitações de conexão aparecem aqui.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-[24px] bg-[var(--duocal-surface-soft)] px-4 py-4">
          <div className="h-3 w-28 animate-pulse rounded-full bg-white" />
          <div className="mt-3 h-3 w-44 animate-pulse rounded-full bg-white" />
        </div>
      ) : null}

      {!isLoading && solicitacoes.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Nenhuma solicitação pendente." />
        </div>
      ) : null}

      {solicitacoes.length > 0 ? (
        <div className="mt-4 space-y-3">
          {solicitacoes.map((solicitacao) => (
            <NotificationRequestCard
              isResponding={isResponding}
              key={solicitacao.solicitacao_id}
              onResponder={onResponder}
              solicitacao={solicitacao}
              timeLabel={formatRelativeTime(solicitacao.dt_solicitacao)}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function formatRelativeTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'agora'
  }

  const diffInMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  )

  if (diffInMinutes < 1) {
    return 'agora'
  }

  if (diffInMinutes < 60) {
    return `há ${diffInMinutes}m`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)

  if (diffInHours < 24) {
    return `há ${diffInHours}h`
  }

  if (diffInHours < 48) {
    return 'ontem'
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}
