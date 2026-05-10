import { useEffect, useMemo, useState } from 'react'
import { Bell, BellOff, Check, DoorOpen } from 'lucide-react'
import {
  BottomNavigation,
  EmptyState,
  NotificationRequestCard,
  ProfileSetupModal,
  ScreenContainer,
  VersionOutdatedModal,
} from '../components'
import {
  useAuthSession,
  useMeuPerfil,
  useNotificacoesSolicitacaoWorkspace,
  useResponderSolicitacaoWorkspace,
  useSolicitacoesWorkspacePendentes,
  type SolicitacaoWorkspacePendente,
} from '../hooks'
import { getErrorMessage, isVersionOutdatedError } from '../lib'
import { formatRelativeTime } from '../components/notifications'

type NotificationFilter = 'Todas' | 'Eventos' | 'Tarefas' | 'Convites'

const filters: NotificationFilter[] = ['Todas', 'Eventos', 'Tarefas', 'Convites']

export function NotificationsPage() {
  const { session, isLoading: isSessionLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil = perfilQuery.data ?? null
  const solicitacoesQuery = useSolicitacoesWorkspacePendentes(
    Boolean(perfil?.id && perfil.fl_perfil_completo),
  )
  const notificacoesQuery = useNotificacoesSolicitacaoWorkspace(
    Boolean(perfil?.id && perfil.fl_perfil_completo),
  )
  const responderSolicitacao = useResponderSolicitacaoWorkspace()
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('Todas')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [versionOutdated, setVersionOutdated] = useState(false)

  useEffect(() => {
    if (!isSessionLoading && !session) {
      window.location.replace('/login')
    }
  }, [isSessionLoading, session])

  const solicitacoes = solicitacoesQuery.data ?? []
  const unreadCount = Math.max(
    solicitacoes.length,
    notificacoesQuery.data?.length ?? 0,
  )
  const visibleSolicitacoes = useMemo(() => {
    if (activeFilter !== 'Todas' && activeFilter !== 'Convites') {
      return []
    }

    return solicitacoes
  }, [activeFilter, solicitacoes])

  const hoje = visibleSolicitacoes.filter((solicitacao) =>
    isToday(solicitacao.dt_solicitacao),
  )
  const estaSemana = visibleSolicitacoes.filter(
    (solicitacao) => !isToday(solicitacao.dt_solicitacao),
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
      if (isVersionOutdatedError(error)) {
        setVersionOutdated(true)
        return
      }

      setErrorMessage(getErrorMessage(error))
    }
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

  return (
    <>
      <ScreenContainer withBottomNavigation>
        <header className="flex items-start justify-between gap-4 pb-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--duocal-muted)]">
              {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
            </p>
            <h1 className="mt-1 text-3xl font-black text-[var(--duocal-text)]">
              Notificações
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Marcar notificações como lidas"
              className="grid size-11 place-items-center rounded-full border border-[var(--duocal-border)] bg-white text-[var(--duocal-text)] shadow-[0_10px_24px_rgba(17,20,74,0.06)]"
              type="button"
            >
              <Check className="size-5" />
            </button>
            <button
              aria-label="Silenciar notificações"
              className="grid size-11 place-items-center rounded-full border border-[var(--duocal-border)] bg-white text-[var(--duocal-text)] shadow-[0_10px_24px_rgba(17,20,74,0.06)]"
              type="button"
            >
              <BellOff className="size-5" />
            </button>
          </div>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              className={[
                'h-9 shrink-0 rounded-full px-4 text-xs font-black transition',
                activeFilter === filter
                  ? 'bg-[var(--duocal-text)] text-white shadow-[0_8px_18px_rgba(17,20,74,0.16)]'
                  : 'bg-white text-[var(--duocal-muted)] shadow-[0_8px_18px_rgba(17,20,74,0.05)]',
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
        />

        {solicitacoesQuery.isLoading || notificacoesQuery.isLoading ? (
          <section className="mt-4 space-y-3">
            <SkeletonNotification />
            <SkeletonNotification />
          </section>
        ) : null}

        {!solicitacoesQuery.isLoading &&
        !notificacoesQuery.isLoading &&
        visibleSolicitacoes.length === 0 ? (
          <section className="mt-5">
            <EmptyState
              description="Quando alguém usar seu código para solicitar conexão, a notificação aparecerá aqui."
              icon={<Bell className="size-5" />}
              title="Nenhuma solicitação pendente."
            />
          </section>
        ) : null}

        <NotificationGroup
          isResponding={responderSolicitacao.isPending}
          onResponder={handleResponderSolicitacao}
          solicitacoes={hoje}
          title="HOJE"
        />
        <NotificationGroup
          isResponding={responderSolicitacao.isPending}
          onResponder={handleResponderSolicitacao}
          solicitacoes={estaSemana}
          title="ESTA SEMANA"
        />
      </ScreenContainer>

      <BottomNavigation
        activeTab="notifications"
        unreadCount={unreadCount}
      />
      {perfilIncompleto && perfil ? <ProfileSetupModal perfil={perfil} /> : null}
      <VersionOutdatedModal open={versionOutdated} />
    </>
  )
}

function NotificationGroup({
  isResponding,
  onResponder,
  solicitacoes,
  title,
}: {
  isResponding: boolean
  onResponder: (solicitacaoId: string, aceitar: boolean) => void
  solicitacoes: SolicitacaoWorkspacePendente[]
  title: string
}) {
  if (solicitacoes.length === 0) {
    return null
  }

  return (
    <section className="mt-5">
      <h2 className="px-1 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--duocal-muted)]">
        {title}
      </h2>
      <div className="mt-2 space-y-3">
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
    </section>
  )
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <ScreenContainer className="items-center justify-center">
      <div className="duocal-gradient size-10 animate-pulse rounded-3xl" />
      <p className="mt-4 text-sm font-medium text-[var(--duocal-muted)]">
        {message}
      </p>
    </ScreenContainer>
  )
}

function ActionFeedback({
  errorMessage,
  feedbackMessage,
}: {
  errorMessage: string | null
  feedbackMessage: string | null
}) {
  if (!feedbackMessage && !errorMessage) {
    return null
  }

  return (
    <div className="mt-4 space-y-3">
      {feedbackMessage ? (
        <p className="rounded-2xl bg-[rgba(53,207,165,0.12)] px-4 py-3 text-sm text-[#159A7D]">
          {feedbackMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-2xl bg-[rgba(255,90,122,0.10)] px-4 py-3 text-sm text-[var(--duocal-danger)]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

function SkeletonNotification() {
  return (
    <div className="rounded-[24px] border border-[var(--duocal-border)] bg-white p-4 shadow-[0_12px_30px_rgba(17,20,74,0.05)]">
      <div className="flex gap-3">
        <div className="size-10 animate-pulse rounded-2xl bg-[var(--duocal-surface-soft)]" />
        <div className="flex-1">
          <div className="h-3 w-40 animate-pulse rounded-full bg-[var(--duocal-surface-soft)]" />
          <div className="mt-3 h-3 w-52 animate-pulse rounded-full bg-[var(--duocal-surface-soft)]" />
        </div>
      </div>
    </div>
  )
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
