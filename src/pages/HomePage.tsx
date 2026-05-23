import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bell,
  CalendarDays,
  Clock,
  DoorOpen,
  Heart,
  KeyRound,
  Link2,
  Plus,
  Users,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  BottomNavigation,
  Button,
  EventCard,
  EventDetailSheet,
  EventFormSheet,
  FeedbackAlert,
  ProfileSetupModal,
  ScreenContainer,
  VersionOutdatedModal,
} from '../components'
import {
  eventosHoje,
  proximoEvento,
  useAuthSession,
  useBuscarEvento,
  useCategoriasEvento,
  useCriarEvento,
  useEditarEvento,
  useEventosWorkspace,
  useMembrosWorkspace,
  useMeuPerfil,
  useRegistrarLoginUsuario,
  useSolicitarConexaoPorCodigo,
  useCriarWorkspaceInicial,
  useUnreadNotificationCount,
  useWorkspaceAtual,
  type AtualizarEventoPayload,
  type CategoriaEvento,
  type CriarEventoPayload,
  type EventoWorkspace,
  type MembroWorkspace,
  type WorkspaceAtual,
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
          <DashboardComWorkspace
            workspace={workspaceAtual!}
            eventos={eventosQuery.data ?? []}
            membros={membrosQuery.data ?? []}
            categorias={categoriasQuery.data ?? []}
            usuarioAtualId={perfil.id}
            isSavingEvento={criarEvento.isPending}
            isLoadingEventos={eventosQuery.isLoading}
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

// ─── Dashboard com workspace ──────────────────────────────────────────────────

function DashboardComWorkspace({
  workspace,
  eventos,
  membros,
  categorias,
  usuarioAtualId,
  isSavingEvento,
  isLoadingEventos,
  showEventForm,
  onOpenEventForm,
  onCloseEventForm,
  onSaveEvento,
}: {
  workspace: WorkspaceAtual
  eventos: EventoWorkspace[]
  membros: MembroWorkspace[]
  categorias: CategoriaEvento[]
  usuarioAtualId: string
  isSavingEvento: boolean
  isLoadingEventos: boolean
  showEventForm: boolean
  onOpenEventForm: () => void
  onCloseEventForm: () => void
  onSaveEvento: (payload: CriarEventoPayload) => Promise<void>
}) {
  const workspaceId = workspace.workspace.id
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoWorkspace | null>(null)
  const [editandoEventoId, setEditandoEventoId] = useState<string | null>(null)
  const buscarEvento = useBuscarEvento(editandoEventoId, workspaceId)
  const editarEvento = useEditarEvento()

  useEffect(() => {
    if (buscarEvento.isError) {
      const timer = window.setTimeout(() => setEditandoEventoId(null), 0)
      return () => window.clearTimeout(timer)
    }
  }, [buscarEvento.isError])

  async function handleSaveEdit(payload: CriarEventoPayload) {
    await editarEvento.mutateAsync(payload as AtualizarEventoPayload)
    setEditandoEventoId(null)
  }

  const agora = new Date()
  const hoje = eventosHoje(eventos)
  const proximo = proximoEvento(eventos)
  const proximos7Dias = eventos.filter(
    (e) => new Date(e.dt_fim) > agora,
  ).slice(0, 5)

  function formatarHorario(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      {/* Card do workspace */}
      <section className="duocal-gradient rounded-[30px] p-5 text-white shadow-[0_18px_50px_rgba(84,102,241,0.22)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white/78">
              Workspace compartilhado
            </p>
            <h2 className="mt-1 truncate text-2xl font-black">
              {workspace.workspace.nm_workspace}
            </h2>
            {workspace.workspace.ds_slogan ? (
              <p className="mt-1 text-sm text-white/70">
                {workspace.workspace.ds_slogan}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1.5">
            <div className="flex -space-x-2">
              {membros.slice(0, 3).map((m) => (
                <MemberAvatar key={m.usuario_id} nome={m.nm_usuario} />
              ))}
            </div>
            <p className="text-[11px] font-semibold text-white/70">
              {workspace.total_membros === 1 ? '1 membro' : `${workspace.total_membros} membros`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/14 px-3.5 py-2.5">
          <span className="size-2 rounded-full bg-[#35CFA5]" />
          <p className="text-xs font-semibold text-white/88">Sincronizado · há instantes</p>
        </div>
      </section>

      {/* Resumo do dia */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard
          icon={<CalendarDays className="size-5" />}
          label="Eventos hoje"
          value={isLoadingEventos ? '...' : String(hoje.length)}
        />
        <SummaryCard
          icon={<Clock className="size-5" />}
          label="Próximo evento"
          value={
            isLoadingEventos
              ? '...'
              : proximo
                ? formatarHorario(proximo.dt_inicio)
                : 'Nenhum'
          }
        />
      </div>

      {/* Card nosso tempo */}
      <section className="duocal-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[18px] bg-[rgba(182,109,255,0.12)] text-(--duocal-violet)">
            <Heart className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-(--duocal-text)">Nosso tempo</p>
            <p className="text-xs text-(--duocal-muted)">
              {hoje.length === 0
                ? 'Comece criando seus primeiros eventos'
                : `${hoje.length} momento${hoje.length > 1 ? 's' : ''} planejado${hoje.length > 1 ? 's' : ''} hoje`}
            </p>
          </div>
        </div>
      </section>

      {/* Próximos compromissos */}
      <section className="duocal-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-black text-(--duocal-text)">
            Próximos compromissos
          </h3>
          <Link
            to="/agenda"
            className="text-xs font-semibold text-(--duocal-primary)"
          >
            Ver agenda
          </Link>
        </div>

        {isLoadingEventos ? (
          <div className="flex items-center gap-1.5 py-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-(--duocal-primary) animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        ) : proximos7Dias.length === 0 ? (
          <div className="py-3 text-center">
            <p className="text-sm text-(--duocal-muted)">Nenhum evento próximo.</p>
            <p className="mt-1 text-xs text-(--duocal-muted)">
              Crie seu primeiro compromisso compartilhado.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {proximos7Dias.map((evento) => (
              <div key={evento.id} className="flex items-start gap-3">
                <div className="mt-1 flex flex-col items-center gap-0.5 text-center">
                  <span className="text-[11px] font-semibold text-(--duocal-muted)">
                    {new Date(evento.dt_inicio).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}
                  </span>
                  <span className="text-lg font-black leading-none text-(--duocal-text)">
                    {new Date(evento.dt_inicio).getDate()}
                  </span>
                </div>
                <div className="flex-1">
                  <EventCard evento={evento} onClick={() => setEventoSelecionado(evento)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Botão novo evento */}
      <Button
        className="w-full"
        icon={<Plus className="size-4" />}
        onClick={onOpenEventForm}
      >
        Novo evento
      </Button>

      {showEventForm && (
        <EventFormSheet
          key="create"
          workspaceId={workspace.workspace.id}
          membros={membros}
          categorias={categorias}
          usuarioAtualId={usuarioAtualId}
          isSaving={isSavingEvento}
          onSave={onSaveEvento}
          onClose={onCloseEventForm}
        />
      )}

      {eventoSelecionado && (
        <EventDetailSheet
          evento={eventoSelecionado}
          onEdit={() => {
            const id = eventoSelecionado.id
            setEventoSelecionado(null)
            setEditandoEventoId(id)
          }}
          onClose={() => setEventoSelecionado(null)}
        />
      )}

      {editandoEventoId && buscarEvento.isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,20,74,0.18)] backdrop-blur-[2px]">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-2 rounded-full bg-(--duocal-primary) animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {editandoEventoId && buscarEvento.data && (
        <EventFormSheet
          key={`edit-${editandoEventoId}`}
          workspaceId={workspace.workspace.id}
          membros={membros}
          categorias={categorias}
          usuarioAtualId={usuarioAtualId}
          eventoParaEditar={buscarEvento.data}
          isSaving={editarEvento.isPending}
          onSave={handleSaveEdit}
          onClose={() => setEditandoEventoId(null)}
        />
      )}
    </div>
  )
}

function MemberAvatar({ nome }: { nome: string | null }) {
  const iniciais = nome
    ? nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    : '?'

  return (
    <div className="grid size-8 place-items-center rounded-full bg-white/30 text-xs font-black text-white ring-2 ring-white/30">
      {iniciais}
    </div>
  )
}

function SummaryCard({
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
      <p className="mt-1 text-xl font-black text-(--duocal-text)">{value}</p>
    </section>
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
