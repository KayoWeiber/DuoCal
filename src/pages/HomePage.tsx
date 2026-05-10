import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Copy,
  DoorOpen,
  Heart,
  KeyRound,
  Link2,
  Plus,
  Share2,
  X,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  BottomNavigation,
  Button,
  ProfileSetupModal,
  ScreenContainer,
  VersionOutdatedModal,
} from '../components'
import {
  useAuthSession,
  useCriarWorkspaceInicial,
  useMeuPerfil,
  useRegistrarLoginUsuario,
  useSolicitarConexaoPorCodigo,
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
      setCodigoPendente(codigoSalvo)
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

  async function handleCopyCode() {
    if (!perfil?.cd_codigo_conexao) {
      return
    }

    try {
      await navigator.clipboard.writeText(perfil.cd_codigo_conexao)
      setFeedbackMessage('Código copiado.')
      setErrorMessage(null)
    } catch {
      setErrorMessage('Não foi possível copiar o código.')
    }
  }

  async function handleShareCode() {
    if (!perfil?.cd_codigo_conexao) {
      return
    }

    const url = buildConnectionUrl(perfil.cd_codigo_conexao)

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'DuoCal',
          text: 'Use este código para solicitar conexão no DuoCal.',
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setFeedbackMessage('Link de conexão copiado.')
      }

      setErrorMessage(null)
    } catch (error) {
      if ((error as { name?: string }).name !== 'AbortError') {
        setErrorMessage('Não foi possível compartilhar o link.')
      }
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
  const workspaceAtual = workspaceQuery.data ?? null

  return (
    <>
      <ScreenContainer withBottomNavigation>
        <header className="flex items-center justify-between gap-3 pb-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--duocal-muted)]">
              Olá, {perfil.nm_usuario ?? 'bem-vindo'}
            </p>
            <h1 className="truncate text-3xl font-black text-[var(--duocal-text)]">
              DuoCal
            </h1>
          </div>
          <Link
            aria-label="Abrir notificações"
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--duocal-border)] bg-white text-[var(--duocal-muted)] shadow-[0_10px_24px_rgba(17,20,74,0.06)] transition hover:text-[var(--duocal-primary)]"
            to="/notificacoes"
          >
            <Bell className="size-5" />
            {unreadCount > 0 ? <HeaderNotificationBadge count={unreadCount} /> : null}
          </Link>
        </header>

        <section className="duocal-gradient duocal-soft-shadow rounded-[30px] p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white/78">
                Seu código de conexão
              </p>
              <p className="mt-2 text-3xl font-black tracking-[0.22em]">
                {perfil.cd_codigo_conexao}
              </p>
            </div>
            <img
              src="/duocal-logo.svg"
              alt="DuoCal"
              className="h-10 w-auto rounded-xl bg-white/95 p-1"
            />
          </div>
          <p className="mt-4 text-sm leading-5 text-white/78">
            Compartilhe este código ou link com quem vai dividir o workspace
            com você.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/16 px-4 text-sm font-bold text-white transition hover:bg-white/22"
              onClick={handleCopyCode}
              type="button"
            >
              <Copy className="size-4" />
              Copiar código
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/16 px-4 text-sm font-bold text-white transition hover:bg-white/22"
              onClick={handleShareCode}
              type="button"
            >
              <Share2 className="size-4" />
              Compartilhar
            </button>
          </div>
        </section>

        <ActionFeedback
          errorMessage={errorMessage}
          feedbackMessage={feedbackMessage}
          onClear={() => {
            setErrorMessage(null)
            setFeedbackMessage(null)
          }}
        />

        <section className="mt-5 space-y-4">
          {workspaceQuery.isLoading ? (
            <StateBlock
              description="Buscando seu espaço compartilhado."
              icon={<Heart className="size-6" />}
              title="Carregando workspace"
            />
          ) : workspaceAtual ? (
            <WorkspaceCard
              nome={workspaceAtual.workspace.nm_workspace}
              papel={workspaceAtual.tp_papel}
              slogan={workspaceAtual.workspace.ds_slogan}
              totalMembros={workspaceAtual.total_membros}
            />
          ) : (
            <NoWorkspacePanel
              connectPending={solicitarConexao.isPending}
              createPending={criarWorkspace.isPending}
              onCodigoChange={(value) =>
                setCodigo(value.replace(/\D/g, '').slice(0, 6))
              }
              onConnect={() => handleRequestConnection()}
              onCreateWorkspace={handleCreateWorkspace}
              onWorkspaceNameChange={setWorkspaceName}
              codigo={codigo}
              workspaceName={workspaceName}
            />
          )}

          <section className="grid grid-cols-2 gap-3">
            <SmallStatusCard
              icon={<CalendarDays className="size-5" />}
              label="Agenda"
              value="Sem eventos"
            />
            <SmallStatusCard
              icon={<Heart className="size-5" />}
              label="Nosso tempo"
              value="Comece hoje"
            />
          </section>
        </section>
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

function HeaderNotificationBadge({ count }: { count: number }) {
  const label = count > 9 ? '9+' : String(count)

  return (
    <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[var(--duocal-danger)] px-1 text-[10px] font-black leading-4 text-white ring-2 ring-white">
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
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[rgba(84,102,241,0.10)] text-[var(--duocal-primary)]">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-bold text-[var(--duocal-text)]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--duocal-muted)]">
        {description}
      </p>
    </section>
  )
}

function WorkspaceCard({
  nome,
  papel,
  slogan,
  totalMembros,
}: {
  nome: string
  papel: string
  slogan: string
  totalMembros: number
}) {
  return (
    <section className="duocal-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--duocal-muted)]">
            Workspace compartilhado
          </p>
          <h2 className="mt-1 text-2xl font-black text-[var(--duocal-text)]">
            {nome}
          </h2>
        </div>
        <span className="rounded-full bg-[rgba(53,207,165,0.14)] px-3 py-1 text-xs font-bold text-[#159A7D]">
          {papel}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--duocal-muted)]">
        {slogan}
      </p>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--duocal-surface-soft)] px-4 py-3 text-sm">
        <span className="text-[var(--duocal-muted)]">Membros ativos</span>
        <span className="font-bold text-[var(--duocal-text)]">
          {totalMembros}
        </span>
      </div>
    </section>
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

  const isError = Boolean(errorMessage)
  const message = errorMessage ?? feedbackMessage

  return (
    <div
      className={[
        'mt-4 overflow-hidden rounded-[24px] border bg-white shadow-[0_14px_34px_rgba(17,20,74,0.08)]',
        isError
          ? 'border-[rgba(255,90,122,0.22)]'
          : 'border-[rgba(53,207,165,0.22)]',
      ].join(' ')}
      role={isError ? 'alert' : 'status'}
    >
      <div
        className={[
          'h-1 w-full',
          isError
            ? 'bg-[var(--duocal-danger)]'
            : 'bg-[var(--duocal-success)]',
        ].join(' ')}
      />
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={[
            'grid size-10 shrink-0 place-items-center rounded-2xl',
            isError
              ? 'bg-[rgba(255,90,122,0.12)] text-[var(--duocal-danger)]'
              : 'bg-[rgba(53,207,165,0.13)] text-[#159A7D]',
          ].join(' ')}
        >
          {isError ? (
            <AlertCircle className="size-5" />
          ) : (
            <CheckCircle2 className="size-5" />
          )}
        </div>
        <p className="min-w-0 flex-1 text-sm font-semibold leading-5 text-[var(--duocal-text)]">
          {message}
        </p>
        <button
          aria-label="Fechar aviso"
          className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--duocal-muted)] transition hover:bg-[var(--duocal-surface-soft)] hover:text-[var(--duocal-text)]"
          onClick={onClear}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

function NoWorkspacePanel({
  codigo,
  connectPending,
  createPending,
  onCodigoChange,
  onConnect,
  onCreateWorkspace,
  onWorkspaceNameChange,
  workspaceName,
}: {
  codigo: string
  connectPending: boolean
  createPending: boolean
  onCodigoChange: (value: string) => void
  onConnect: () => void
  onCreateWorkspace: () => void
  onWorkspaceNameChange: (value: string) => void
  workspaceName: string
}) {
  return (
    <section className="duocal-card p-5">
      <div className="duocal-gradient flex size-12 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_rgba(84,102,241,0.22)]">
        <Link2 className="size-6" />
      </div>
      <h2 className="mt-4 text-xl font-black text-[var(--duocal-text)]">
        Workspace compartilhado
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--duocal-muted)]">
        Você ainda não possui um workspace compartilhado. Digite o código de
        conexão recebido para enviar uma solicitação.
      </p>

      <div className="mt-5 space-y-3">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--duocal-text)]">
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

      <div className="my-5 h-px bg-[var(--duocal-border)]" />

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
      <section className="duocal-card w-full max-w-[430px] p-5">
        <div className="duocal-gradient flex size-12 items-center justify-center rounded-2xl text-white">
          <Link2 className="size-6" />
        </div>
        <h2 className="mt-4 text-xl font-black text-[var(--duocal-text)]">
          Solicitar conexão?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--duocal-muted)]">
          Enviar solicitação para o código{' '}
          <span className="font-black tracking-[0.18em] text-[var(--duocal-text)]">
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
    <section className="duocal-card rounded-[24px] p-4">
      <div className="text-[var(--duocal-primary)]">{icon}</div>
      <p className="mt-3 text-sm text-[var(--duocal-muted)]">{label}</p>
      <p className="mt-1 text-base font-bold text-[var(--duocal-text)]">
        {value}
      </p>
    </section>
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

function buildConnectionUrl(codigo: string) {
  return `${window.location.origin}/conectar?codigo=${codigo}`
}
