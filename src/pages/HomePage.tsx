import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  CalendarDays,
  DoorOpen,
  Heart,
  KeyRound,
  Link2,
  LogOut,
  Plus,
} from 'lucide-react'
import {
  Button,
  ProfileSetupModal,
  ScreenContainer,
  VersionOutdatedModal,
} from '../components'
import {
  useAuthSession,
  useConectarUsuarioPorToken,
  useCriarWorkspaceInicial,
  useMeuPerfil,
  useRegistrarLoginUsuario,
  useWorkspaceAtual,
} from '../hooks'
import { getErrorMessage, isVersionOutdatedError, supabase } from '../lib'

export function HomePage() {
  const { session, isLoading: isSessionLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil = perfilQuery.data ?? null
  const workspaceQuery = useWorkspaceAtual(perfil)
  const registrarLogin = useRegistrarLoginUsuario()
  const conectarPorToken = useConectarUsuarioPorToken()
  const criarWorkspace = useCriarWorkspaceInicial()
  const loginRegistradoRef = useRef<string | null>(null)
  const [token, setToken] = useState('')
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

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  async function handleConnect() {
    setErrorMessage(null)
    setFeedbackMessage(null)

    if (token.length !== 6) {
      setErrorMessage('Informe um token com 6 dígitos.')
      return
    }

    try {
      await conectarPorToken.mutateAsync(token)
      setToken('')
      setFeedbackMessage('Workspace conectado com sucesso.')
    } catch (error) {
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
          title="Nao foi possivel carregar seu perfil"
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
      <ScreenContainer>
        <header className="flex items-center justify-between gap-3 pb-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--duocal-muted)]">
              Olá, {perfil.nm_usuario ?? 'bem-vindo'}
            </p>
            <h1 className="truncate text-3xl font-black text-[var(--duocal-text)]">
              DuoCal
            </h1>
          </div>
          <button
            aria-label="Sair"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--duocal-border)] bg-white text-[var(--duocal-muted)] shadow-[0_10px_24px_rgba(17,20,74,0.06)] transition hover:text-[var(--duocal-primary)]"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut className="size-5" />
          </button>
        </header>

        <section className="duocal-gradient duocal-soft-shadow rounded-[30px] p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white/78">Seu token</p>
              <p className="mt-2 text-3xl font-black tracking-[0.22em]">
                {perfil.cd_token_conexao}
              </p>
            </div>
            <img
              src="/duocal-logo.svg"
              alt="DuoCal"
              className="h-10 w-auto rounded-xl bg-white/95 p-1"
            />
          </div>
          <p className="mt-4 text-sm leading-5 text-white/78">
            Compartilhe este código com a pessoa que vai dividir o workspace
            com você.
          </p>
        </section>

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
              connectPending={conectarPorToken.isPending}
              createPending={criarWorkspace.isPending}
              errorMessage={errorMessage}
              feedbackMessage={feedbackMessage}
              onConnect={handleConnect}
              onCreateWorkspace={handleCreateWorkspace}
              onTokenChange={(value) =>
                setToken(value.replace(/\D/g, '').slice(0, 6))
              }
              onWorkspaceNameChange={setWorkspaceName}
              token={token}
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
            Workspace
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

function NoWorkspacePanel({
  connectPending,
  createPending,
  errorMessage,
  feedbackMessage,
  onConnect,
  onCreateWorkspace,
  onTokenChange,
  onWorkspaceNameChange,
  token,
  workspaceName,
}: {
  connectPending: boolean
  createPending: boolean
  errorMessage: string | null
  feedbackMessage: string | null
  onConnect: () => void
  onCreateWorkspace: () => void
  onTokenChange: (value: string) => void
  onWorkspaceNameChange: (value: string) => void
  token: string
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
        Você ainda não possui um workspace compartilhado. Conecte-se com outra
        pessoa usando o token de 6 dígitos ou crie seu espaço inicial.
      </p>

      <div className="mt-5 space-y-3">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--duocal-text)]">
            Token de conexão
          </span>
          <input
            className="duocal-input px-4 text-center text-xl font-black tracking-[0.22em]"
            inputMode="numeric"
            maxLength={6}
            onChange={(event) => onTokenChange(event.target.value)}
            placeholder="000000"
            value={token}
          />
        </label>

        <Button
          className="w-full"
          icon={<KeyRound className="size-4" />}
          isLoading={connectPending}
          onClick={onConnect}
        >
          Conectar usando token
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

      {feedbackMessage ? (
        <p className="mt-4 rounded-2xl bg-[rgba(53,207,165,0.12)] px-4 py-3 text-sm text-[#159A7D]">
          {feedbackMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-2xl bg-[rgba(255,90,122,0.10)] px-4 py-3 text-sm text-[var(--duocal-danger)]">
          {errorMessage}
        </p>
      ) : null}
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
    <section className="duocal-card rounded-[24px] p-4">
      <div className="text-[var(--duocal-primary)]">{icon}</div>
      <p className="mt-3 text-sm text-[var(--duocal-muted)]">{label}</p>
      <p className="mt-1 text-base font-bold text-[var(--duocal-text)]">
        {value}
      </p>
    </section>
  )
}
