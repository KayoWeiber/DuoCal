import { Check, Link2, X } from 'lucide-react'
import type { SolicitacaoWorkspacePendente } from '../../hooks'
import { Button } from '../ui/Button'

type NotificationRequestCardProps = {
  isResponding: boolean
  onResponder: (solicitacaoId: string, aceitar: boolean) => void
  solicitacao: SolicitacaoWorkspacePendente
  timeLabel?: string
}

export function NotificationRequestCard({
  isResponding,
  onResponder,
  solicitacao,
  timeLabel,
}: NotificationRequestCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[24px] border border-[rgba(229,231,240,0.86)] bg-white p-4 shadow-[0_12px_30px_rgba(17,20,74,0.05)]">
      <span className="absolute left-0 top-6 h-8 w-1 rounded-r-full duocal-gradient" />
      <div className="flex gap-3 pl-2">
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[rgba(84,102,241,0.10)] text-[var(--duocal-primary)]">
          <Link2 className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-black leading-5 text-[var(--duocal-text)]">
              {solicitacao.nm_usuario_solicitante} quer se conectar com você
            </h3>
            {timeLabel ? (
              <span className="shrink-0 text-[11px] font-semibold text-[rgba(107,114,128,0.64)]">
                {timeLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--duocal-muted)]">
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
