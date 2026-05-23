import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bell,
  CalendarDays,
  DoorOpen,
  KeyRound,
  Link2,
  Plus,
  Users,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  BottomNavigation,
  Button,
  FeedbackAlert,
  HomeDashboard,
  ProfileSetupModal,
  ScreenContainer,
  VersionOutdatedModal,
} from '../components'
import {
  useAuthSession,
  useCategoriasEvento,
  useCriarEvento,
  useEventosWorkspace,
  useMembrosWorkspace,
  useMeuPerfil,
  useRegistrarLoginUsuario,
  useSolicitarConexaoPorCodigo,
  useSyncQueue,
  useTarefasKanban,
  useCriarWorkspaceInicial,
  useUnreadNotificationCount,
  useWorkspaceAtual,
} from '../hooks'
import {
  clearPendingConnectionCode,
  getErrorMessage,
  getPendingConnectionCode,
  isVersionOutdatedError,
  supabase,
} from '../lib'

function hojeRangeISO() {
  const d = new Date()
  const inicio = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
  const fimProximos = new Date(inicio.getTime() + 7 * 24 * 60 * 60 * 1000)
  return {
    dtInicio: inicio.toISOString(),
    dtFim: fimProximos.toISOString(),
  }
}

export function HomePage() {
  const { session, isLoading: isSessionLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil = perfilQuery.data ?? null
  const workspaceQuery = useWorkspaceAtual(perfil)
  const { unreadCount } = useUnreadNotificationCount(perfil)
  const registrarLogin = useRegistrarLoginUsuario()
  const solicitarConexao = useSolicitarConexaoPorCodigo()
  const criarWorkspace = useCriarWorkspaceInicial()
  const loginRegistradoRef = useRef<string | null>(null)
  const [codigo, setCodigo] = useState('')
  const [codigoPendente, setCodigoPendente] = useState<string | null>(null)
  const [workspaceName, setWorkspaceName] = useState('Meu DuoCal')
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [versionOutdated, setVersionOutdated] = useState(false)
  const [showEventForm, setShowEventForm] = useState(false)

  const workspaceAtual = workspaceQuery.data ?? null
  const workspaceId = workspaceAtual?.workspace.id ?? null

  const { dtInicio, dtFim } = hojeRangeISO()
  const eventosQuery = useEventosWorkspace(workspaceId, dtInicio, dtFim)
  const membrosQuery = useMembrosWorkspace(workspaceId)
  const categoriasQuery = useCategoriasEvento(workspaceId)
  const tarefasQuery = useTarefasKanban(workspaceId)
  const syncQueue = useSyncQueue(workspaceId)
  const criarEvento = useCriarEvento()

  useEffect(() => {
    if (!isSessionLoading && !session) {
      window.location.replace('/login')
    }
  }, [isSessionLoading, session])

  useEffect(() => {
    if (!session?.user.id || loginRegistradoRef.current === session.user.id) {
      return
    }

    loginRegistradoRef.current = session.user.id
    registrarLogin.mutate()
  }, [registrarLogin, session?.user.id])

  useEffect(() => {
    if (!perfil?.fl_perfil_completo || codigoPendente) {
      return
    }

    const codigoSalvo = getPendingConnectionCode()

    if (codigoSalvo) {
      const timer = window.setTimeout(() => setCodigoPendente(codigoSalvo), 0)
      return () => window.clearTimeout(timer)
    }
  }, [codigoPendente, perfil?.fl_perfil_completo])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  async function handleRequestConnection(rawCodigo = codigo) {
    setErrorMessage(null)
    setFeedbackMessage(null)

    const veioDoLinkPendente = rawCodigo === codigoPendente
    const codigoValido = validarCodigo(rawCodigo, perfil?.cd_codigo_conexao)

    if (!codigoValido.ok) {
      if (veioDoLinkPendente) {
        setCodigoPendente(null)
        clearPendingConnectionCode()
      }

      setErrorMessage(codigoValido.message)
      return
    }

    try {
      await solicitarConexao.mutateAsync(codigoValido.codigo)
      setCodigo('')
      setCodigoPendente(null)
      clearPendingConnectionCode()
      setFeedbackMessage(
        'Solicitação enviada. Agora é só aguardar a outra pessoa aceitar.',
      )
    } catch (error) {
      if (veioDoLinkPendente) {
        setCodigoPendente(null)
        clearPendingConnectionCode()
      }

      handleActionError(error)
    }
  }

  async function handleCreateWorkspace() {
    setErrorMessage(null)
    setFeedbackMessage(null)

    try {
      await criarWorkspace.mutateAsync(workspaceName.trim() || 'Meu DuoCal')
      setFeedbackMessage('Workspace inicial criado.')
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
    return <LoadingScreen message="Abrindo o DuoCal..." />
  }

  if (perfilQuery.isLoading) {
    return <LoadingScreen message="Carregando seu perfil..." />
  }

  if (perfilQuery.error) {
    return (
      <ScreenContainer className="justify-center">
        <StateBlock
          description={getErrorMessage(perfilQuery.error)}
          icon={<DoorOpen className="size-6" />}
          title="Não foi possível carregar seu perfil"
        />
        <Button className="mt-5 w-full" onClick={handleSignOut}>
          Voltar ao login
        </Button>
      </ScreenContainer>
    )
  }

  if (!perfil) {
    return <LoadingScreen message="Preparando sua conta..." />
  }

  const perfilIncompleto = !perfil.fl_perfil_completo || !perfil.nm_usuario
  const temWorkspace = Boolean(workspaceAtual)

  return (
    <>
      <ScreenContainer withBottomNavigation>
        {/* Header comum */}
        <header className="flex items-center justify-between gap-3 pb-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-(--duocal-muted)">
              Olá, {perfil.nm_usuario ?? 'bem-vindo'}
            </p>
            <h1 className="truncate text-3xl font-black text-(--duocal-text)">
              DuoCal
            </h1>
          </div>
          <Link
            aria-label="Abrir notificações"
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-(--duocal-border) bg-white text-(--duocal-muted) shadow-[0_10px_24px_rgba(17,20,74,0.06)] transition hover:text-(--duocal-primary)"
            to="/notificacoes"
          >
            <Bell className="size-5" />
            {unreadCount > 0 ? <NotificationBadge count={unreadCount} /> : null}
          </Link>
        </header>

        {workspaceQuery.isLoading ? (
          <WorkspaceLoadingSection />
        ) : temWorkspace ? (
          <HomeDashboard
            workspace={workspaceAtual!}
            eventos={eventosQuery.data ?? []}
            tarefas={tarefasQuery.data ?? []}
            membros={membrosQuery.data ?? []}
            categorias={categoriasQuery.data ?? []}
            usuarioAtualId={perfil.id}
            isSavingEvento={criarEvento.isPending}
            isLoadingEventos={eventosQuery.isLoading}
            isLoadingTarefas={tarefasQuery.isLoading}
            isOnline={syncQueue.isOnline}
            pendingCount={syncQueue.pendingCount}
            syncState={syncQueue.syncState}
            showEventForm={showEventForm}
            onOpenEventForm={() => setShowEventForm(true)}
            onCloseEventForm={() => setShowEventForm(false)}
            onSaveEvento={async (payload) => {
              try {
                await criarEvento.mutateAsync(payload)
              } catch (error) {
                if (isVersionOutdatedError(error)) {
                  setVersionOutdated(true)
                }
                throw error
              }
            }}
          />
        ) : (
          <SemWorkspaceSection
            codigo={codigo}
            connectPending={solicitarConexao.isPending}
            createPending={criarWorkspace.isPending}
            errorMessage={errorMessage}
            feedbackMessage={feedbackMessage}
            onClearFeedback={() => {
              setErrorMessage(null)
              setFeedbackMessage(null)
            }}
            onCodigoChange={(value) =>
              setCodigo(value.replace(/\D/g, '').slice(0, 6))
            }
            onConnect={() => handleRequestConnection()}
            onCreateWorkspace={handleCreateWorkspace}
            onWorkspaceNameChange={setWorkspaceName}
            workspaceName={workspaceName}
          />
        )}
      </ScreenContainer>

      <BottomNavigation activeTab="home" unreadCount={unreadCount} />

      <PendingConnectionModal
        codigo={codigoPendente}
        isPending={solicitarConexao.isPending}
        onCancel={() => {
          setCodigoPendente(null)
          clearPendingConnectionCode()
        }}
        onConfirm={() => {
          if (codigoPendente) {
            void handleRequestConnection(codigoPendente)
          }
        }}
      />
      {perfilIncompleto ? <ProfileSetupModal perfil={perfil} /> : null}
      <VersionOutdatedModal open={versionOutdated} />
    </>
  )
}

// ─── Seção sem workspace ──────────────────────────────────────────────────────

function SemWorkspaceSection({
  codigo,
  connectPending,
  createPending,
  errorMessage,
  feedbackMessage,
  onClearFeedback,
  onCodigoChange,
  onConnect,
  onCreateWorkspace,
  onWorkspaceNameChange,
  workspaceName,
}: {
  codigo: string
  connectPending: boolean
  createPending: boolean
  errorMessage: string | null
  feedbackMessage: string | null
  onClearFeedback: () => void
  onCodigoChange: (value: string) => void
  onConnect: () => void
  onCreateWorkspace: () => void
  onWorkspaceNameChange: (value: string) => void
  workspaceName: string
}) {
  return (
    <div className="space-y-4">
      {(feedbackMessage || errorMessage) ? (
        <FeedbackAlert
          message={feedbackMessage ?? errorMessage ?? ''}
          onClose={onClearFeedback}
          variant={errorMessage ? 'error' : 'success'}
        />
      ) : null}

      <section className="duocal-card p-5">
        <div className="duocal-gradient flex size-12 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_rgba(84,102,241,0.22)]">
          <Link2 className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-black text-(--duocal-text)">
          Workspace compartilhado
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--duocal-muted)">
          Você ainda não possui um workspace compartilhado. Digite o código de
          conexão recebido para enviar uma solicitação.
        </p>

        <div className="mt-5 space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-(--duocal-text)">
              Conectar com outra pessoa
            </span>
            <input
              className="duocal-input px-4 text-center text-xl font-black tracking-[0.22em]"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => onCodigoChange(event.target.value)}
              placeholder="000000"
              value={codigo}
            />
          </label>

          <Button
            className="w-full"
            icon={<KeyRound className="size-4" />}
            isLoading={connectPending}
            onClick={onConnect}
          >
            Solicitar conexão
          </Button>
        </div>

        <div className="my-5 h-px bg-(--duocal-border)" />

        <div className="space-y-3">
          <input
            className="duocal-input text-base"
            onChange={(event) => onWorkspaceNameChange(event.target.value)}
            placeholder="Nome do workspace"
            value={workspaceName}
          />
          <Button
            className="w-full"
            icon={<Plus className="size-4" />}
            isLoading={createPending}
            onClick={onCreateWorkspace}
            variant="secondary"
          >
            Criar meu workspace
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <SmallStatusCard
          icon={<CalendarDays className="size-5" />}
          label="Agenda"
          value="Sem eventos"
        />
        <SmallStatusCard
          icon={<Users className="size-5" />}
          label="Membros"
          value="Apenas você"
        />
      </section>
    </div>
  )
}

// ─── Helpers de UI ───────────────────────────────────────────────────────────

function WorkspaceLoadingSection() {
  return (
    <div className="duocal-card p-5">
      <div className="flex items-center gap-3">
        <div className="duocal-gradient size-10 animate-pulse rounded-2xl" />
        <div className="space-y-2">
          <div className="h-3 w-32 animate-pulse rounded-full bg-(--duocal-border)" />
          <div className="h-2 w-20 animate-pulse rounded-full bg-(--duocal-border)" />
        </div>
      </div>
    </div>
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

function NotificationBadge({ count }: { count: number }) {
  const label = count > 9 ? '9+' : String(count)

  return (
    <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-(--duocal-danger) px-1 text-[10px] font-black leading-4 text-white ring-2 ring-white">
      {label}
    </span>
  )
}

function StateBlock({
  description,
  icon,
  title,
}: {
  description: string
  icon: ReactNode
  title: string
}) {
  return (
    <section className="duocal-card p-5">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(84,102,241,0.10)] text-(--duocal-primary)">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-bold text-(--duocal-text)">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-(--duocal-muted)">{description}</p>
    </section>
  )
}

function SmallStatusCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <section className="duocal-card rounded-3xl p-4">
      <div className="text-(--duocal-primary)">{icon}</div>
      <p className="mt-3 text-sm text-(--duocal-muted)">{label}</p>
      <p className="mt-1 text-base font-bold text-(--duocal-text)">{value}</p>
    </section>
  )
}

function PendingConnectionModal({
  codigo,
  isPending,
  onCancel,
  onConfirm,
}: {
  codigo: string | null
  isPending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!codigo) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(17,20,74,0.32)] px-4 pb-4 backdrop-blur-sm sm:items-center">
      <section className="duocal-card duocal-constrained-width w-full overflow-y-auto p-5" style={{ maxHeight: 'min(90dvh, 480px)' }}>
        <div className="duocal-gradient flex size-12 items-center justify-center rounded-2xl text-white">
          <Link2 className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-black text-(--duocal-text)">
          Solicitar conexão?
        </h2>
        <p className="mt-2 text-sm leading-6 text-(--duocal-muted)">
          Enviar solicitação para o código{' '}
          <span className="font-black tracking-[0.18em] text-(--duocal-text)">
            {codigo}
          </span>
          ?
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button onClick={onCancel} variant="secondary">
            Agora não
          </Button>
          <Button isLoading={isPending} onClick={onConfirm}>
            Enviar
          </Button>
        </div>
      </section>
    </div>
  )
}

function validarCodigo(codigo: string, codigoProprio: string | undefined) {
  const codigoLimpo = codigo.trim()

  if (!/^\d{6}$/.test(codigoLimpo)) {
    return {
      ok: false as const,
      message: 'Informe um código com exatamente 6 dígitos.',
    }
  }

  if (codigoLimpo === codigoProprio) {
    return {
      ok: false as const,
      message: 'Você não pode solicitar conexão usando o próprio código.',
    }
  }

  return {
    ok: true as const,
    codigo: codigoLimpo,
  }
}

