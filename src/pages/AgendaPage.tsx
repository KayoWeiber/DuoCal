import { useEffect, useState } from 'react'
import { CalendarDays, Plus, Search } from 'lucide-react'
import {
  BottomNavigation,
  EmptyState,
  EventCard,
  EventFormSheet,
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
  useUnreadNotificationCount,
  useWorkspaceAtual,
} from '../hooks'
import { isVersionOutdatedError } from '../lib'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function gerarDias(base: Date, qtd = 14) {
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() - 3 + i)
    return d
  })
}

function toDateISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toTimestampStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString()
}

function toTimestampEnd(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString()
}

export function AgendaPage() {
  const { session, isLoading: isSessionLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil = perfilQuery.data ?? null
  const workspaceQuery = useWorkspaceAtual(perfil)
  const workspace = workspaceQuery.data ?? null
  const workspaceId = workspace?.workspace.id ?? null
  const { unreadCount } = useUnreadNotificationCount(perfil)

  const [diaSelecionado, setDiaSelecionado] = useState<Date>(() => new Date())
  const [filtroCadMembro, setFiltroCadMembro] = useState<string>('todos')
  const [showForm, setShowForm] = useState(false)
  const [versionOutdated, setVersionOutdated] = useState(false)

  const hoje = new Date()
  const dias = gerarDias(hoje)

  const dtInicio = toTimestampStart(diaSelecionado)
  const dtFim = toTimestampEnd(diaSelecionado)

  const eventosQuery = useEventosWorkspace(workspaceId, dtInicio, dtFim)
  const membrosQuery = useMembrosWorkspace(workspaceId)
  const categoriasQuery = useCategoriasEvento(workspaceId)
  const criarEvento = useCriarEvento()

  useEffect(() => {
    if (!isSessionLoading && !session) {
      window.location.replace('/login')
    }
  }, [isSessionLoading, session])

  const membros = membrosQuery.data ?? []
  const categorias = categoriasQuery.data ?? []

  let eventos = eventosQuery.data ?? []

  if (filtroCadMembro !== 'todos') {
    eventos = eventos.filter((e) =>
      (e.participantes ?? []).some((p) => p.usuario_id === filtroCadMembro),
    )
  }

  const perfilIncompleto = Boolean(
    perfil && (!perfil.fl_perfil_completo || !perfil.nm_usuario),
  )

  const mesAno = `${MESES[diaSelecionado.getMonth()]} ${diaSelecionado.getFullYear()}`

  async function handleSave(payload: Parameters<typeof criarEvento.mutateAsync>[0]) {
    try {
      await criarEvento.mutateAsync(payload)
    } catch (error) {
      if (isVersionOutdatedError(error)) {
        setVersionOutdated(true)
        throw error
      }
      throw error
    }
  }

  return (
    <>
      <ScreenContainer withBottomNavigation className="pb-4">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 pb-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--duocal-muted)]">{mesAno}</p>
            <h1 className="text-3xl font-black text-[var(--duocal-text)]">Agenda</h1>
          </div>
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--duocal-border)] bg-white text-[var(--duocal-muted)] shadow-[0_10px_24px_rgba(17,20,74,0.06)] transition hover:text-[var(--duocal-primary)]"
            aria-label="Buscar evento"
          >
            <Search className="size-5" />
          </button>
        </header>

        {/* Strip de dias */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {dias.map((dia) => {
            const iso = toDateISO(dia)
            const isHoje = toDateISO(hoje) === iso
            const isSel = toDateISO(diaSelecionado) === iso

            return (
              <button
                key={iso}
                type="button"
                onClick={() => setDiaSelecionado(dia)}
                className="flex min-w-[46px] flex-col items-center gap-1 rounded-[18px] py-2.5 px-1.5 transition"
                style={
                  isSel
                    ? { background: 'linear-gradient(135deg,#5466F1,#B66DFF)', color: '#fff' }
                    : isHoje
                      ? { background: 'rgba(84,102,241,0.08)', color: 'var(--duocal-primary)' }
                      : { color: 'var(--duocal-muted)' }
                }
              >
                <span className="text-[11px] font-semibold">
                  {DIAS_SEMANA[dia.getDay()]}
                </span>
                <span className="text-lg font-black leading-none">
                  {dia.getDate()}
                </span>
              </button>
            )
          })}
        </div>

        {/* Filtro por membro */}
        {membros.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <PillButton
              label="Todos"
              active={filtroCadMembro === 'todos'}
              onClick={() => setFiltroCadMembro('todos')}
            />
            {membros.map((m) => (
              <PillButton
                key={m.usuario_id}
                label={primeiroNome(m.nm_usuario)}
                active={filtroCadMembro === m.usuario_id}
                onClick={() => setFiltroCadMembro(m.usuario_id)}
              />
            ))}
          </div>
        )}

        {/* Conteúdo */}
        <div className="mt-5 space-y-3">
          {workspaceQuery.isLoading || eventosQuery.isLoading ? (
            <LoadingDots />
          ) : !workspaceId ? (
            <EmptyState
              icon={<CalendarDays className="size-5" />}
              title="Sem workspace"
              description="Conecte-se a um workspace para ver eventos na agenda."
            />
          ) : eventos.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="size-5" />}
              title="Nenhum evento"
              description="Não há eventos para este dia. Crie o primeiro compromisso compartilhado."
            />
          ) : (
            eventos.map((evento) => (
              <EventCard key={evento.id} evento={evento} />
            ))
          )}
        </div>
      </ScreenContainer>

      {/* FAB Novo evento */}
      {workspaceId && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+80px)] right-1/2 z-20 translate-x-[calc(215px-100%)] duocal-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(84,102,241,0.38)] hover:shadow-[0_14px_34px_rgba(84,102,241,0.46)] transition"
        >
          <Plus className="size-4" />
          Novo evento
        </button>
      )}

      <BottomNavigation activeTab="agenda" unreadCount={unreadCount} />

      {showForm && workspaceId && perfil && (
        <EventFormSheet
          workspaceId={workspaceId}
          membros={membros}
          categorias={categorias}
          usuarioAtualId={perfil.id}
          isSaving={criarEvento.isPending}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}

      {perfilIncompleto && perfil ? <ProfileSetupModal perfil={perfil} /> : null}
      <VersionOutdatedModal open={versionOutdated} />
    </>
  )
}

function PillButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition"
      style={
        active
          ? { background: 'linear-gradient(135deg,#5466F1,#B66DFF)', color: '#fff' }
          : {
              background: 'var(--duocal-surface-soft)',
              color: 'var(--duocal-muted)',
            }
      }
    >
      {label}
    </button>
  )
}

function LoadingDots() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-10">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 rounded-full bg-[var(--duocal-primary)] animate-pulse"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function primeiroNome(nome: string | null) {
  return nome?.trim().split(/\s+/)[0] ?? 'Membro'
}

