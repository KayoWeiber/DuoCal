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
      setErrorMessage('Informe um token com 6 digitos.')
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
            <p className="text-sm font-medium text-slate-500">
              Ola, {perfil.nm_usuario ?? 'bem-vindo'}
            </p>
            <h1 className="truncate text-3xl font-black text-slate-950">
              DuoCal
            </h1>
          </div>
          <button
            aria-label="Sair"
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut className="size-5" />
          </button>
        </header>

        <section className="rounded-[30px] bg-slate-950 p-5 text-white shadow-xl shadow-slate-300">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300">Seu token</p>
              <p className="mt-2 text-3xl font-black tracking-[0.22em]">
                {perfil.cd_token_conexao}
              </p>
            </div>
            <img src="/duocal-logo.svg" alt="DuoCal" className="h-10 w-auto rounded-xl bg-white/95 p-1" />
          </div>
          <p className="mt-4 text-sm leading-5 text-slate-300">
            Compartilhe este codigo com a pessoa que vai dividir o workspace com
            voce.
          </p>
        </section>

        <section className="mt-5 space-y-4">
          {workspaceQuery.isLoading ? (
            <StateBlock
              description="Buscando seu espaco compartilhado."
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
      <div className="size-10 animate-pulse rounded-3xl bg-slate-200" />
      <p className="mt-4 text-sm font-medium text-slate-500">{message}</p>
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
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800">
        {icon}
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
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
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Workspace</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">{nome}</h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          {papel}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-500">{slogan}</p>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-500">Membros ativos</span>
        <span className="font-bold text-slate-950">{totalMembros}</span>
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
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
        <Link2 className="size-6" />
      </div>
      <h2 className="mt-4 text-xl font-black text-slate-950">
        Workspace compartilhado
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Voce ainda nao possui um workspace compartilhado. Conecte-se com outra
        pessoa usando o token de 6 digitos ou crie seu espaco inicial.
      </p>

      <div className="mt-5 space-y-3">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            Token de conexao
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-xl font-black tracking-[0.22em] text-slate-950 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
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

      <div className="my-5 h-px bg-slate-100" />

      <div className="space-y-3">
        <input
          className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-slate-950 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
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
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedbackMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-slate-500">{icon}</div>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-950">{value}</p>
    </section>
  )
}
