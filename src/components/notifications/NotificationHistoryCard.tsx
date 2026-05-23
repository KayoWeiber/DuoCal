import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  HeartHandshake,
  XCircle,
} from 'lucide-react'
import type { NotificacaoSolicitacaoWorkspace } from '../../hooks'
import { formatRelativeTime } from './notificationUtils'

type NotificationHistoryCardProps = {
  notificacao: NotificacaoSolicitacaoWorkspace
  onMarkRead?: (notificacaoId: string) => void
}

export function NotificationHistoryCard({
  notificacao,
  onMarkRead,
}: NotificationHistoryCardProps) {
  const unread = !notificacao.fl_lida

  return (
    <button
      className={[
        'relative w-full overflow-hidden rounded-3xl border p-4 text-left shadow-[0_12px_30px_rgba(17,20,74,0.05)] transition active:scale-[0.99]',
        unread
          ? 'border-[rgba(84,102,241,0.24)] bg-[rgba(84,102,241,0.06)]'
          : 'border-[rgba(229,231,240,0.86)] bg-white',
      ].join(' ')}
      onClick={() => {
        if (unread) {
          onMarkRead?.(notificacao.notificacao_id)
        }
      }}
      type="button"
    >
      {unread ? (
        <span className="absolute left-0 top-6 h-8 w-1 rounded-r-full duocal-gradient" />
      ) : null}
      <div className="flex gap-3 pl-2">
        <div
          className={[
            'grid size-10 shrink-0 place-items-center rounded-2xl',
            unread
              ? 'duocal-gradient text-white'
              : 'bg-(--duocal-surface-soft) text-(--duocal-muted)',
          ].join(' ')}
        >
          <NotificationHistoryIcon tpNotificacao={notificacao.tp_notificacao} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3
              className={[
                'text-sm leading-5 text-(--duocal-text)',
                unread ? 'font-black' : 'font-bold',
              ].join(' ')}
            >
              {notificacao.nm_titulo}
            </h3>
            <span className="shrink-0 text-[11px] font-semibold text-[rgba(107,114,128,0.64)]">
              {formatRelativeTime(notificacao.created_at)}
            </span>
          </div>
          {unread ? (
            <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-(--duocal-primary)">
              Nova
            </span>
          ) : null}
          <p className="mt-1 text-xs leading-5 text-(--duocal-muted)">
            {notificacao.ds_mensagem}
          </p>
        </div>
      </div>
    </button>
  )
}

function NotificationHistoryIcon({ tpNotificacao }: { tpNotificacao: string }) {
  if (tpNotificacao.includes('ACEITA')) {
    return <CheckCircle2 className="size-5" />
  }

  if (tpNotificacao.includes('RECUSADA')) {
    return <XCircle className="size-5" />
  }

  if (tpNotificacao.startsWith('SOLICITACAO') || tpNotificacao.includes('CONVITE')) {
    return <HeartHandshake className="size-5" />
  }

  if (tpNotificacao.startsWith('EVENTO') || tpNotificacao.includes('LEMBRETE')) {
    return <CalendarDays className="size-5" />
  }

  if (tpNotificacao.startsWith('TAREFA')) {
    return <ClipboardList className="size-5" />
  }

  return <Bell className="size-5" />
}
