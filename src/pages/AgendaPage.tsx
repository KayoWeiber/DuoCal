import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Filter, Plus, Search } from 'lucide-react'
import {
  BottomNavigation,
  EventDetailSheet,
  EventFormSheet,
  OfflineBar,
  ProfileSetupModal,
  VersionOutdatedModal,
} from '../components'
import {
  useAuthSession,
  useBuscarEvento,
  useCategoriasEvento,
  useConfiguracaoWorkspace,
  useCriarEvento,
  useEditarEvento,
  useEventosWorkspace,
  useMembrosWorkspace,
  useMeuPerfil,
  useSyncQueue,
  useUnreadNotificationCount,
  useWorkspaceAtual,
} from '../hooks'
import { isVersionOutdatedError } from '../lib'
import type {
  AtualizarEventoPayload,
  CategoriaEvento,
  CriarEventoPayload,
  EventoWorkspace,
  MembroWorkspace,
} from '../hooks'
import type { SyncQueueItem } from '../lib'
import { AgendaTimeline } from '../components/agenda/AgendaTimeline'
import {
  buildAgendaVisualMap,
  type AgendaResponsavelVisual,
  type AgendaVisualMap,
} from '../components/agenda/agendaVisual'

// ─── Constantes ───────────────────────────────────────────────────────────────

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES_ABREV = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
]

// ─── Helpers de data ──────────────────────────────────────────────────────────

function gerarDias(base: Date, qtd = 14): Date[] {
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() - 3 + i)
    return d
  })
}

function toDateISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toTimestampStart(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString()
}

function toTimestampEnd(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString()
}

// ─── Helpers de eventos pendentes ─────────────────────────────────────────────

function pendingItemToEvento(
  item: SyncQueueItem,
  membros: MembroWorkspace[],
  categorias: CategoriaEvento[],
): EventoWorkspace {
  const p = item.payload as CriarEventoPayload
  const categoria = categorias.find((c) => c.id === p.categoriaId)
  return {
    id: `local:${item.local_id}`,
    workspace_id: item.workspace_id,
    nm_evento: p.nmEvento,
    ds_evento: p.dsEvento ?? null,
    dt_inicio: p.dtInicio,
    dt_fim: p.dtFim,
    fl_dia_todo: p.flDiaTodo ?? false,
    fl_bloqueia_horario: p.flBloqueiaHorario ?? false,
    fl_recorrente: p.flRecorrente ?? false,
    tp_status: 'PENDENTE',
    categoria_id: p.categoriaId ?? null,
    nm_categoria: categoria?.nm_categoria ?? null,
    cd_cor_categoria: categoria?.cd_cor ?? null,
    cd_icone_categoria: categoria?.cd_icone ?? null,
    participantes: membros
      .filter((m) => p.participantes.includes(m.usuario_id))
      .map((m) => ({
        usuario_id: m.usuario_id,
        nm_usuario: m.nm_usuario,
        tp_participacao: 'PARTICIPANTE' as const,
        fl_responsavel_principal: false,
      })),
  }
}

function pendingItemsForDay(
  items: SyncQueueItem[],
  dtInicioDay: string,
  dtFimDay: string,
): SyncQueueItem[] {
  const inicio = new Date(dtInicioDay)
  const fim = new Date(dtFimDay)
  return items.filter((item) => {
    const p = item.payload as CriarEventoPayload
    return new Date(p.dtInicio) < fim && new Date(p.dtFim) > inicio
  })
}

function filtrarEventos(eventos: EventoWorkspace[], filtro: string): EventoWorkspace[] {
  if (filtro === 'todos') return eventos
  if (filtro === 'casal') return eventos.filter(e => (e.participantes ?? []).length > 1)
  return eventos.filter(e => (e.participantes ?? []).some(p => p.usuario_id === filtro))
}

// ─── Subcomponente: Seletor de dias ──────────────────────────────────────────

function AgendaDayStrip({
  dias,
  diaSelecionado,
  hoje,
  onSelect,
}: {
  dias: Date[]
  diaSelecionado: Date
  hoje: Date
  onSelect: (d: Date) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selISO = toDateISO(diaSelecionado)
  const hojeISO = toDateISO(hoje)

  // Scroll para o dia selecionado
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const btn = container.querySelector<HTMLButtonElement>('[data-selected="true"]')
    btn?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [selISO])

  return (
    <div
      ref={scrollRef}
      className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {dias.map((dia) => {
        const iso = toDateISO(dia)
        const selected = iso === selISO
        const isHoje = iso === hojeISO

        return (
          <button
            key={iso}
            type="button"
            data-selected={selected}
            onClick={() => onSelect(dia)}
            className="flex shrink-0 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 transition-all"
            style={
              selected
                ? { background: 'linear-gradient(135deg,#5466F1,#B66DFF)', color: '#fff', minWidth: 44 }
                : isHoje
                  ? { background: 'rgba(84,102,241,0.10)', color: 'var(--duocal-primary)', minWidth: 44 }
                  : { color: 'var(--duocal-muted)', minWidth: 44 }
            }
          >
            <span className="text-[10px] font-semibold leading-none">
              {DIAS_SEMANA[dia.getDay()]}
            </span>
            <span
              className="text-base font-black leading-none"
              style={{ color: selected ? '#fff' : isHoje ? 'var(--duocal-primary)' : 'var(--duocal-text)' }}
            >
              {dia.getDate()}
            </span>
            {isHoje && !selected && (
              <span className="size-1 rounded-full bg-(--duocal-primary)" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Subcomponente: Chips de filtro ──────────────────────────────────────────

function AgendaFiltroChips({
  membros,
  filtro,
  visualMap,
  onFiltro,
}: {
  membros: MembroWorkspace[]
  filtro: string
  visualMap: AgendaVisualMap
  onFiltro: (f: string) => void
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <ChipBtn
        label="Todos"
        active={filtro === 'todos'}
        onClick={() => onFiltro('todos')}
      />
      {membros.map((m) => (
        <ChipBtn
          key={m.usuario_id}
          active={filtro === m.usuario_id}
          visual={visualMap.byMemberId[m.usuario_id]}
          onClick={() => onFiltro(m.usuario_id)}
        />
      ))}
      {membros.length > 1 && (
        <ChipBtn
          active={filtro === 'casal'}
          visual={visualMap.casal}
          onClick={() => onFiltro('casal')}
        />
      )}
    </div>
  )
}

function ChipBtn({
  active,
  label = 'Todos',
  visual,
  onClick,
}: {
  active: boolean
  label?: string
  visual?: AgendaResponsavelVisual
  onClick: () => void
}) {
  const activeStyle = visual
    ? { background: visual.solidBackground, borderColor: 'transparent', color: '#fff' }
    : {
        background: 'linear-gradient(135deg,#5466F1,#B66DFF)',
        borderColor: 'transparent',
        color: '#fff',
      }
  const inactiveStyle = {
    background: 'var(--duocal-surface)',
    borderColor: visual?.border ?? 'var(--duocal-border)',
    color: visual?.text ?? 'var(--duocal-muted)',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-black shadow-[0_8px_18px_rgba(17,20,74,0.05)] transition-all active:scale-[0.98]"
      style={active ? activeStyle : inactiveStyle}
    >
      {visual ? (
        <span
          className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-black"
          style={{
            background: active ? 'rgba(255,255,255,0.22)' : visual.solidBackground,
            color: '#fff',
          }}
        >
          {visual.initials}
        </span>
      ) : null}
      <span className="max-w-28 truncate">{visual?.label ?? label}</span>
    </button>
  )
}

// ─── Subcomponentes: estados da timeline ──────────────────────────────────────

function LoadingTimeline() {
  return (
    <div className="flex h-full items-center justify-center gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 animate-pulse rounded-full bg-(--duocal-primary)"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function EmptyTimeline({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-sm text-(--duocal-muted)">{message}</p>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function AgendaPage() {
  const { session, isLoading: isSessionLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil = perfilQuery.data ?? null
  const workspaceQuery = useWorkspaceAtual(perfil)
  const workspace = workspaceQuery.data ?? null
  const workspaceId = workspace?.workspace.id ?? null
  const { unreadCount } = useUnreadNotificationCount(perfil)
  const configuracaoQuery = useConfiguracaoWorkspace(workspaceId)

  const [diaSelecionado, setDiaSelecionado] = useState<Date>(() => new Date())
  const [filtro, setFiltro] = useState('todos')
  const [showForm, setShowForm] = useState(false)
  const [versionOutdated, setVersionOutdated] = useState(false)
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoWorkspace | null>(null)
  const [editandoEventoId, setEditandoEventoId] = useState<string | null>(null)
  const [timelineExpanded, setTimelineExpanded] = useState(false)

  const hoje = new Date()
  const dias = gerarDias(hoje)
  const dtInicio = toTimestampStart(diaSelecionado)
  const dtFim = toTimestampEnd(diaSelecionado)

  const eventosQuery = useEventosWorkspace(workspaceId, dtInicio, dtFim)
  const membrosQuery = useMembrosWorkspace(workspaceId)
  const categoriasQuery = useCategoriasEvento(workspaceId)
  const criarEvento = useCriarEvento()
  const editarEvento = useEditarEvento()
  const buscarEvento = useBuscarEvento(editandoEventoId, workspaceId)
  const { isOnline, syncState, pendingItems, pendingCount, reloadPending } =
    useSyncQueue(workspaceId)

  useEffect(() => {
    if (!isSessionLoading && !session) window.location.replace('/login')
  }, [isSessionLoading, session])

  useEffect(() => {
    if (!buscarEvento.isError) return

    const timer = window.setTimeout(() => setEditandoEventoId(null), 0)
    return () => window.clearTimeout(timer)
  }, [buscarEvento.isError])

  const membros = useMemo(() => membrosQuery.data ?? [], [membrosQuery.data])
  const agendaVisualMap = useMemo(() => buildAgendaVisualMap(membros), [membros])
  const categorias = useMemo(() => categoriasQuery.data ?? [], [categoriasQuery.data])

  const eventosServidor = useMemo(
    () => filtrarEventos(eventosQuery.data ?? [], filtro),
    [eventosQuery.data, filtro],
  )

  const eventosPendentes = useMemo(() => {
    const itens = pendingItemsForDay(pendingItems, dtInicio, dtFim)
    return itens.map(item => pendingItemToEvento(item, membros, categorias))
  }, [pendingItems, dtInicio, dtFim, membros, categorias])

  const eventosPendentesFiltrados = useMemo(
    () => filtrarEventos(eventosPendentes, filtro),
    [eventosPendentes, filtro],
  )

  const perfilIncompleto = Boolean(perfil && (!perfil.fl_perfil_completo || !perfil.nm_usuario))
  const isLoading = workspaceQuery.isLoading || eventosQuery.isLoading
  const mesAno = `${MESES_ABREV[diaSelecionado.getMonth()]} ${diaSelecionado.getFullYear()}`
  const configuracao = configuracaoQuery.data

  async function handleSave(payload: CriarEventoPayload) {
    try {
      await criarEvento.mutateAsync(payload)
      await reloadPending()
    } catch (error) {
      if (isVersionOutdatedError(error)) { setVersionOutdated(true); throw error }
      throw error
    }
  }

  async function handleSaveEdit(payload: CriarEventoPayload) {
    try {
      await editarEvento.mutateAsync(payload as AtualizarEventoPayload)
      setEditandoEventoId(null)
    } catch (error) {
      if (isVersionOutdatedError(error)) { setVersionOutdated(true); throw error }
      throw error
    }
  }

  return (
    <>
      <div
        className="duocal-app-shell min-h-dvh overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-3 pb-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {!timelineExpanded ? (
                <p className="text-[10px] font-bold uppercase tracking-widest text-(--duocal-muted)">
                  {mesAno}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => setTimelineExpanded((expanded) => !expanded)}
                aria-expanded={!timelineExpanded}
                aria-label={timelineExpanded ? 'Mostrar calendário da agenda' : 'Ocultar calendário da agenda'}
                className="flex min-w-0 items-center gap-0.5 text-left text-[26px] font-black leading-none text-(--duocal-text)"
              >
                Agenda
                <ChevronDown
                  className="size-5 shrink-0 text-(--duocal-muted) transition-transform"
                  style={{ transform: timelineExpanded ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                />
              </button>
              {timelineExpanded ? (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-(--duocal-muted)">
                  Dia completo · 00h-23h
                </p>
              ) : null}
            </div>
            {!timelineExpanded ? (
              <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Buscar evento"
                className="grid size-9 place-items-center rounded-full border border-(--duocal-border) bg-white text-(--duocal-muted) shadow-[0_2px_8px_rgba(17,20,74,0.07)] transition hover:text-(--duocal-primary)"
              >
                <Search className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Filtrar"
                className="grid size-9 place-items-center rounded-full border border-(--duocal-border) bg-white text-(--duocal-muted) shadow-[0_2px_8px_rgba(17,20,74,0.07)] transition hover:text-(--duocal-primary)"
              >
                <Filter className="size-4" />
              </button>
              </div>
            ) : null}
          </div>
        </div>

        {/* Offline bar */}
        {(!isOnline || syncState !== 'idle' || pendingCount > 0) && (
          <div className="shrink-0 px-5 pb-2">
            <OfflineBar isOnline={isOnline} syncState={syncState} pendingCount={pendingCount} />
          </div>
        )}

        {!timelineExpanded ? (
          <>
            {/* Seletor de dias */}
            <div className="shrink-0 px-5 pb-1">
              <AgendaDayStrip
                dias={dias}
                diaSelecionado={diaSelecionado}
                hoje={hoje}
                onSelect={setDiaSelecionado}
              />
            </div>

            {/* Chips de filtro */}
            {membros.length > 0 && (
              <div className="shrink-0 px-5 pb-3">
                <AgendaFiltroChips
                  membros={membros}
                  filtro={filtro}
                  visualMap={agendaVisualMap}
                  onFiltro={setFiltro}
                />
              </div>
            )}
          </>
        ) : (
          <div className="h-1 shrink-0" />
        )}

        <div
          className={[
            'mx-3 overflow-hidden rounded-3xl bg-white shadow-[0_4px_24px_rgba(17,20,74,0.07)]',
            timelineExpanded
              ? 'h-[calc(100dvh-8.75rem-env(safe-area-inset-bottom,0px))] min-h-[520px]'
              : 'h-[min(68dvh,720px)] min-h-[420px]',
          ].join(' ')}
        >
          {isLoading ? (
            <LoadingTimeline />
          ) : !workspaceId ? (
            <EmptyTimeline message="Conecte-se a um workspace para ver seus eventos." />
          ) : (
            <AgendaTimeline
              eventos={eventosServidor}
              eventosPendentes={eventosPendentesFiltrados}
              diaSelecionado={diaSelecionado}
              visualMap={agendaVisualMap}
              hrInicioDia={timelineExpanded ? '00:00' : configuracao?.hrInicioDia}
              hrFimDia={timelineExpanded ? '23:00' : configuracao?.hrFimDia}
              autoScrollToCurrent={!timelineExpanded}
              onEventoClick={setEventoSelecionado}
            />
          )}
        </div>

      </div>

      {/* FAB Novo evento */}
      {workspaceId && (
        <div
          className="duocal-constrained-width fixed z-20 flex w-full justify-end px-5"
          style={{
            bottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 16px)',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(84,102,241,0.38)] transition hover:shadow-[0_14px_34px_rgba(84,102,241,0.46)]"
            style={{ background: 'linear-gradient(135deg,#5466F1,#B66DFF)' }}
          >
            <Plus className="size-4" />
            Novo evento
          </button>
        </div>
      )}

      <BottomNavigation activeTab="agenda" unreadCount={unreadCount} />

      {/* Formulário de criação */}
      {showForm && workspaceId && perfil && (
        <EventFormSheet
          key="create"
          workspaceId={workspaceId}
          membros={membros}
          categorias={categorias}
          usuarioAtualId={perfil.id}
          isSaving={criarEvento.isPending}
          onSave={handleSave}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Detail sheet ao clicar num evento */}
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

      {/* Loading enquanto busca dados para edição */}
      {editandoEventoId && buscarEvento.isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,20,74,0.18)] backdrop-blur-[2px]">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-2 animate-pulse rounded-full bg-(--duocal-primary)"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Formulário de edição */}
      {editandoEventoId && buscarEvento.data && workspaceId && perfil && (
        <EventFormSheet
          key={`edit-${editandoEventoId}`}
          workspaceId={workspaceId}
          membros={membros}
          categorias={categorias}
          usuarioAtualId={perfil.id}
          eventoParaEditar={buscarEvento.data}
          isSaving={editarEvento.isPending}
          onSave={handleSaveEdit}
          onClose={() => setEditandoEventoId(null)}
        />
      )}

      {perfilIncompleto && perfil ? <ProfileSetupModal perfil={perfil} /> : null}
      <VersionOutdatedModal open={versionOutdated} />
    </>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────
