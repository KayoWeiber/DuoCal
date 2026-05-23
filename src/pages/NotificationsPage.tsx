import { useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, Check, DoorOpen } from 'lucide-react'
import {
  BottomNavigation,
  EmptyState,
  FeedbackAlert,
  NotificationHistoryCard,
  NotificationRequestCard,
  ProfileSetupModal,
  ScreenContainer,
  VersionOutdatedModal,
} from '../components'
import {
  useAuthSession,
  useMarcarNotificacaoLida,
  useMarcarTodasNotificacoesLidas,
  useMeuPerfil,
  useMinhasNotificacoes,
  useResponderSolicitacaoWorkspace,
  useSolicitacoesWorkspacePendentes,
  type NotificacaoSolicitacaoWorkspace,
  type SolicitacaoWorkspacePendente,
} from '../hooks'
import { getErrorMessage, isVersionOutdatedError } from '../lib'
import { formatRelativeTime } from '../components/notifications'

type NotificationFilter = 'Todas' | 'Eventos' | 'Tarefas' | 'Convites'

type NotificationListItem =
  | {
      categoria: NotificationFilter
      createdAt: string
      id: string
      isUnread: boolean
      notificacao?: NotificacaoSolicitacaoWorkspace
      solicitacao: SolicitacaoWorkspacePendente
      type: 'request'
    }
  | {
      categoria: NotificationFilter
      createdAt: string
      id: string
      isUnread: boolean
      notificacao: NotificacaoSolicitacaoWorkspace
      type: 'history'
    }

const filters: NotificationFilter[] = ['Todas', 'Eventos', 'Tarefas', 'Convites']

export function NotificationsPage() {
  const { session, isLoading: isSessionLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil = perfilQuery.data ?? null
  const enabled = Boolean(perfil?.id && perfil.fl_perfil_completo)
  const solicitacoesQuery = useSolicitacoesWorkspacePendentes(enabled)
  const notificacoesQuery = useMinhasNotificacoes(enabled)
  const responderSolicitacao = useResponderSolicitacaoWorkspace()
  const marcarNotificacaoLida = useMarcarNotificacaoLida()
  const marcarTodasLidas = useMarcarTodasNotificacoesLidas()
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('Todas')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [versionOutdated, setVersionOutdated] = useState(false)

  useEffect(() => {
    if (!isSessionLoading && !session) {
      window.location.replace('/login')
    }
  }, [isSessionLoading, session])

  const notificacoes = useMemo(
    () => notificacoesQuery.data ?? [],
    [notificacoesQuery.data],
  )
  const solicitacoes = useMemo(
    () => solicitacoesQuery.data ?? [],
    [solicitacoesQuery.data],
  )
  const unreadCount = notificacoes.filter((notificacao) => !notificacao.fl_lida)
    .length

  const visibleItems = useMemo(() => {
    const items = buildNotificationItems(notificacoes, solicitacoes)
      .filter((item) => matchesFilter(item, activeFilter))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return items
  }, [activeFilter, notificacoes, solicitacoes])

  const hoje = visibleItems.filter((item) => isToday(item.createdAt))
  const estaSemana = visibleItems.filter(
    (item) => !isToday(item.createdAt) && isThisWeek(item.createdAt),
  )
  const anteriores = visibleItems.filter(
    (item) => !isToday(item.createdAt) && !isThisWeek(item.createdAt),
  )

  async function handleResponderSolicitacao(
    solicitacaoId: string,
    aceitar: boolean,
  ) {
    setErrorMessage(null)
    setFeedbackMessage(null)

    try {
      await responderSolicitacao.mutateAsync({ solicitacaoId, aceitar })
      setFeedbackMessage(
        aceitar ? 'Solicitação aceita.' : 'Solicitação recusada.',
      )
    } catch (error) {
      handleActionError(error)
    }
  }

  async function handleMarkRead(notificacaoId: string) {
    setErrorMessage(null)

    try {
      await marcarNotificacaoLida.mutateAsync(notificacaoId)
    } catch (error) {
      handleActionError(error)
    }
  }

  async function handleMarkAllRead() {
    setErrorMessage(null)
    setFeedbackMessage(null)

    try {
      await marcarTodasLidas.mutateAsync()
      setFeedbackMessage('Notificações marcadas como lidas.')
    } catch (error) {
      handleActionError(error)
    }
  }

  function handleActionError(error: unknown) {
    if (isVersionOutdatedError(error)) {
      setVersionOutdated(true)
      return
    }

    setErrorMessage(getErrorMessage(error))
  }

  if (isSessionLoading || (!session && !perfilQuery.isError)) {
    return <LoadingScreen message="Carregando notificações..." />
  }

  if (perfilQuery.isLoading) {
    return <LoadingScreen message="Preparando sua central..." />
  }

  if (perfilQuery.error) {
    return (
      <>
        <ScreenContainer withBottomNavigation>
          <EmptyState
            description={getErrorMessage(perfilQuery.error)}
            icon={<DoorOpen className="size-5" />}
            title="Não foi possível carregar suas notificações"
          />
        </ScreenContainer>
        <BottomNavigation activeTab="notifications" />
      </>
    )
  }

  const perfilIncompleto = Boolean(perfil && !perfil.fl_perfil_completo)
  const isLoading = solicitacoesQuery.isLoading || notificacoesQuery.isLoading
  const isEmpty = !isLoading && visibleItems.length === 0

  return (
    <>
      <ScreenContainer withBottomNavigation>
        <header className="flex items-start justify-between gap-4 pb-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-(--duocal-muted)">
              {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
            </p>
            <h1 className="mt-1 text-3xl font-black text-(--duocal-text)">
              Notificações
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Marcar notificações como lidas"
              className="grid size-11 place-items-center rounded-full border border-(--duocal-border) bg-white text-(--duocal-text) shadow-[0_10px_24px_rgba(17,20,74,0.06)] transition disabled:opacity-45"
              disabled={unreadCount === 0 || marcarTodasLidas.isPending}
              onClick={handleMarkAllRead}
              type="button"
            >
              <Check className="size-5" />
            </button>
            <button
              aria-label="Silenciar notificações"
              className="grid size-11 place-items-center rounded-full border border-(--duocal-border) bg-white text-(--duocal-text) shadow-[0_10px_24px_rgba(17,20,74,0.06)]"
              type="button"
            >
              <BellOff className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {filters.map((filter) => (
            <button
              className={[
                'h-9 shrink-0 rounded-full px-4 text-xs font-black transition',
                activeFilter === filter
                  ? 'bg-(--duocal-text) text-white shadow-[0_8px_18px_rgba(17,20,74,0.16)]'
                  : 'bg-white text-(--duocal-muted) shadow-[0_8px_18px_rgba(17,20,74,0.05)]',
              ].join(' ')}
              key={filter}
              onClick={() => setActiveFilter(filter)}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>

        <ActionFeedback
          errorMessage={errorMessage}
          feedbackMessage={feedbackMessage}
          onClear={() => {
            setErrorMessage(null)
            setFeedbackMessage(null)
          }}
        />

        {isLoading ? (
          <section className="mt-4 space-y-3">
            <SkeletonNotification />
            <SkeletonNotification />
          </section>
        ) : null}

        {isEmpty ? (
          <section className="mt-5">
            <EmptyState
              description="Quando houver convites, solicitações, eventos ou tarefas, eles aparecerão aqui."
              icon={<Bell className="size-5" />}
              title="Nenhuma notificação por enquanto."
            />
          </section>
        ) : null}

        <NotificationGroup
          isResponding={responderSolicitacao.isPending}
          items={hoje}
          onMarkRead={handleMarkRead}
          onResponder={handleResponderSolicitacao}
          title="HOJE"
        />
        <NotificationGroup
          isResponding={responderSolicitacao.isPending}
          items={estaSemana}
          onMarkRead={handleMarkRead}
          onResponder={handleResponderSolicitacao}
          title="ESTA SEMANA"
        />
        <NotificationGroup
          isResponding={responderSolicitacao.isPending}
          items={anteriores}
          onMarkRead={handleMarkRead}
          onResponder={handleResponderSolicitacao}
          title="ANTERIORES"
        />
      </ScreenContainer>

      <BottomNavigation activeTab="notifications" unreadCount={unreadCount} />
      {perfilIncompleto && perfil ? <ProfileSetupModal perfil={perfil} /> : null}
      <VersionOutdatedModal open={versionOutdated} />
    </>
  )
}

function NotificationGroup({
  isResponding,
  items,
  onMarkRead,
  onResponder,
  title,
}: {
  isResponding: boolean
  items: NotificationListItem[]
  onMarkRead: (notificacaoId: string) => void
  onResponder: (solicitacaoId: string, aceitar: boolean) => void
  title: string
}) {
  if (items.length === 0) {
    return null
  }

  return (
    <section className="mt-5">
      <h2 className="px-1 text-[11px] font-black uppercase tracking-[0.14em] text-(--duocal-muted)">
        {title}
      </h2>
      <div className="mt-2 space-y-3">
        {items.map((item) =>
          item.type === 'request' ? (
            <NotificationRequestCard
              isResponding={isResponding}
              isUnread={item.isUnread}
              key={item.id}
              onResponder={onResponder}
              solicitacao={item.solicitacao}
              timeLabel={formatRelativeTime(item.createdAt)}
            />
          ) : (
            <NotificationHistoryCard
              key={item.id}
              notificacao={item.notificacao}
              onMarkRead={onMarkRead}
            />
          ),
        )}
      </div>
    </section>
  )
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <ScreenContainer className="items-center justify-center">
      <div className="duocal-gradient size-10 animate-pulse rounded-3xl" />
      <p className="mt-4 text-sm font-medium text-(--duocal-muted)">
        {message}
      </p>
    </ScreenContainer>
  )
}

function ActionFeedback({
  errorMessage,
  feedbackMessage,
  onClear,
}: {
  errorMessage: string | null
  feedbackMessage: string | null
  onClear: () => void
}) {
  if (!feedbackMessage && !errorMessage) {
    return null
  }

  return (
    <div className="mt-4 space-y-3">
      {feedbackMessage ? (
        <FeedbackAlert
          message={feedbackMessage}
          onClose={onClear}
          variant="success"
        />
      ) : null}

      {errorMessage ? (
        <FeedbackAlert
          message={errorMessage}
          onClose={onClear}
          title="Não foi possível responder"
          variant="error"
        />
      ) : null}
    </div>
  )
}

function SkeletonNotification() {
  return (
    <div className="rounded-3xl border border-(--duocal-border) bg-white p-4 shadow-[0_12px_30px_rgba(17,20,74,0.05)]">
      <div className="flex gap-3">
        <div className="size-10 animate-pulse rounded-2xl bg-(--duocal-surface-soft)" />
        <div className="flex-1">
          <div className="h-3 w-40 animate-pulse rounded-full bg-(--duocal-surface-soft)" />
          <div className="mt-3 h-3 w-52 animate-pulse rounded-full bg-(--duocal-surface-soft)" />
        </div>
      </div>
    </div>
  )
}

function buildNotificationItems(
  notificacoes: NotificacaoSolicitacaoWorkspace[],
  solicitacoes: SolicitacaoWorkspacePendente[],
) {
  const solicitacoesPorId = new Map(
    solicitacoes.map((solicitacao) => [solicitacao.solicitacao_id, solicitacao]),
  )
  const solicitacoesComNotificacao = new Set<string>()
  const items: NotificationListItem[] = []

  for (const notificacao of notificacoes) {
    const solicitacao =
      notificacao.tp_notificacao === 'SOLICITACAO_WORKSPACE' &&
      notificacao.entidade_id
        ? solicitacoesPorId.get(notificacao.entidade_id)
        : undefined

    if (solicitacao) {
      solicitacoesComNotificacao.add(solicitacao.solicitacao_id)
      items.push({
        categoria: 'Convites',
        createdAt: notificacao.created_at,
        id: `request-${solicitacao.solicitacao_id}`,
        isUnread: !notificacao.fl_lida,
        notificacao,
        solicitacao,
        type: 'request',
      })
      continue
    }

    items.push({
      categoria: getNotificationCategory(notificacao.tp_notificacao),
      createdAt: notificacao.created_at,
      id: `notification-${notificacao.notificacao_id}`,
      isUnread: !notificacao.fl_lida,
      notificacao,
      type: 'history',
    })
  }

  for (const solicitacao of solicitacoes) {
    if (solicitacoesComNotificacao.has(solicitacao.solicitacao_id)) {
      continue
    }

    items.push({
      categoria: 'Convites',
      createdAt: solicitacao.dt_solicitacao,
      id: `request-orphan-${solicitacao.solicitacao_id}`,
      isUnread: false,
      solicitacao,
      type: 'request',
    })
  }

  return items
}

function getNotificationCategory(tpNotificacao: string): NotificationFilter {
  if (tpNotificacao.startsWith('EVENTO') || tpNotificacao.includes('LEMBRETE')) {
    return 'Eventos'
  }

  if (tpNotificacao.startsWith('TAREFA')) {
    return 'Tarefas'
  }

  if (
    tpNotificacao.startsWith('SOLICITACAO') ||
    tpNotificacao.includes('CONVITE')
  ) {
    return 'Convites'
  }

  return 'Todas'
}

function matchesFilter(item: NotificationListItem, filter: NotificationFilter) {
  return filter === 'Todas' || item.categoria === filter
}

function isToday(value: string) {
  const date = new Date(value)
  const now = new Date()

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function isThisWeek(value: string) {
  const date = new Date(value)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  return date >= startOfWeek
}
