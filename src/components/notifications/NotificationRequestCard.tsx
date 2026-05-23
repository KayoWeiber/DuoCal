import { Check, Link2, X } from 'lucide-react'
import type { SolicitacaoWorkspacePendente } from '../../hooks'
import { Button } from '../ui/Button'

type NotificationRequestCardProps = {
  isUnread?: boolean
  isResponding: boolean
  onResponder: (solicitacaoId: string, aceitar: boolean) => void
  solicitacao: SolicitacaoWorkspacePendente
  timeLabel?: string
}

export function NotificationRequestCard({
  isUnread = false,
  isResponding,
  onResponder,
  solicitacao,
  timeLabel,
}: NotificationRequestCardProps) {
  return (
    <article
      className={[
        'relative overflow-hidden rounded-3xl border p-4 shadow-[0_12px_30px_rgba(17,20,74,0.05)]',
        isUnread
          ? 'border-[rgba(84,102,241,0.24)] bg-[rgba(84,102,241,0.06)]'
          : 'border-[rgba(229,231,240,0.86)] bg-white',
      ].join(' ')}
    >
      {isUnread ? (
        <span className="absolute left-0 top-6 h-8 w-1 rounded-r-full duocal-gradient" />
      ) : null}
      <div className="flex gap-3 pl-2">
        <div
          className={[
            'grid size-10 shrink-0 place-items-center rounded-2xl',
            isUnread
              ? 'duocal-gradient text-white'
              : 'bg-[rgba(84,102,241,0.10)] text-(--duocal-primary)',
          ].join(' ')}
        >
          <Link2 className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-black leading-5 text-(--duocal-text)">
              {solicitacao.nm_usuario_solicitante} quer se conectar com você
            </h3>
            {timeLabel ? (
              <span className="shrink-0 text-[11px] font-semibold text-[rgba(107,114,128,0.64)]">
                {timeLabel}
              </span>
            ) : null}
          </div>
          {isUnread ? (
            <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-(--duocal-primary)">
              Nova
            </span>
          ) : null}
          <p className="mt-1 text-xs leading-5 text-(--duocal-muted)">
            Ele solicitou participar do seu workspace compartilhado.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="min-h-9 rounded-xl px-4 text-xs"
              icon={<X className="size-3.5" />}
              isLoading={isResponding}
              onClick={() => onResponder(solicitacao.solicitacao_id, false)}
              variant="secondary"
            >
              Recusar
            </Button>
            <Button
              className="min-h-9 rounded-xl px-4 text-xs"
              icon={<Check className="size-3.5" />}
              isLoading={isResponding}
              onClick={() => onResponder(solicitacao.solicitacao_id, true)}
            >
              Aceitar
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
