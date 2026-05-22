import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, Search } from 'lucide-react'
import {
  BottomNavigation,
  EmptyState,
  EventCard,
  EventFormSheet,
  OfflineBar,
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
  useSyncQueue,
  useUnreadNotificationCount,
  useWorkspaceAtual,
} from '../hooks'
import { isVersionOutdatedError } from '../lib'
import type { CategoriaEvento, CriarEventoPayload, EventoWorkspace, MembroWorkspace } from '../hooks'
import type { SyncQueueItem } from '../lib'

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
    const eventoInicio = new Date(p.dtInicio)
    const eventoFim = new Date(p.dtFim)
    return eventoInicio < fim && eventoFim > inicio
  })
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

  const { isOnline, syncState, pendingItems, pendingCount, reloadPending } =
    useSyncQueue(workspaceId)

  useEffect(() => {
    if (!isSessionLoading && !session) {
      window.location.replace('/login')
    }
  }, [isSessionLoading, session])

  const membros = membrosQuery.data ?? []
  const categorias = categoriasQuery.data ?? []
  let eventosServidor = eventosQuery.data ?? []
  if (filtroCadMembro !== 'todos') {
    eventosServidor = eventosServidor.filter((e) =>
      (e.participantes ?? []).some((p) => p.usuario_id === filtroCadMembro),
    )
  }

  const eventosPendentes = useMemo(() => {
    const itemsDoDia = pendingItemsForDay(pendingItems, dtInicio, dtFim)
    return itemsDoDia.map((item) => pendingItemToEvento(item, membros, categorias))
  }, [pendingItems, dtInicio, dtFim, membros, categorias])

  const eventosPendentesFiltrados = useMemo(() => {
    if (filtroCadMembro === 'todos') return eventosPendentes
    return eventosPendentes.filter((e) =>
      (e.participantes ?? []).some((p) => p.usuario_id === filtroCadMembro),
    )
  }, [eventosPendentes, filtroCadMembro])

  const perfilIncompleto = Boolean(
    perfil && (!perfil.fl_perfil_completo || !perfil.nm_usuario),
  )

  const mesAno = `${MESES[diaSelecionado.getMonth()]} ${diaSelecionado.getFullYear()}`

  async function handleSave(payload: CriarEventoPayload) {
    try {
      await criarEvento.mutateAsync(payload)

      await reloadPending()
    } catch (error) {
      if (isVersionOutdatedError(error)) {
        setVersionOutdated(true)
        throw error
      }
      throw error
    }
  }

  const isLoading = workspaceQuery.isLoading || eventosQuery.isLoading
  const temEventos = eventosServidor.length > 0 || eventosPendentesFiltrados.length > 0

  return (
    <>
      <ScreenContainer withBottomNavigation>
        {/* Header */}
        <header className="flex items-center justify-between gap-3 pb-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-(--duocal-muted)">{mesAno}</p>
            <h1 className="text-3xl font-black text-(--duocal-text)">Agenda</h1>
          </div>
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-(--duocal-border) bg-white text-(--duocal-muted) shadow-[0_10px_24px_rgba(17,20,74,0.06)] transition hover:text-(--duocal-primary)"
            aria-label="Buscar evento"
          >
            <Search className="size-5" />
          </button>
        </header>

        {/* Indicador offline/sync */}
        {((!isOnline || syncState !== 'idle' || pendingCount > 0)) && (
          <div className="mt-2">
            <OfflineBar
              isOnline={isOnline}
              syncState={syncState}
              pendingCount={pendingCount}
            />
          </div>
        )}

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
                className="flex min-w-11.5 flex-col items-center gap-1 rounded-[18px] py-2.5 px-1.5 transition"
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
          {isLoading ? (
            <LoadingDots />
          ) : !workspaceId ? (
            <EmptyState
              icon={<CalendarDays className="size-5" />}
              title="Sem workspace"
              description="Conecte-se a um workspace para ver eventos na agenda."
            />
          ) : !temEventos ? (
            <EmptyState
              icon={<CalendarDays className="size-5" />}
              title="Nenhum evento"
              description="Não há eventos para este dia. Crie o primeiro compromisso compartilhado."
            />
          ) : (
            <>
              {/* Eventos pendentes (criados offline) aparecem primeiro */}
              {eventosPendentesFiltrados.map((evento) => (
                <EventCard key={evento.id} evento={evento} isPending />
              ))}
              {eventosServidor.map((evento) => (
                <EventCard key={evento.id} evento={evento} />
              ))}
            </>
          )}
        </div>
      </ScreenContainer>

      {/* FAB Novo evento */}
      {workspaceId && (
        <div className="duocal-constrained-width fixed bottom-[calc(env(safe-area-inset-bottom)+80px)] left-1/2 z-20 flex w-full -translate-x-1/2 justify-end px-5">
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="duocal-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(84,102,241,0.38)] transition hover:shadow-[0_14px_34px_rgba(84,102,241,0.46)]"
          >
            <Plus className="size-4" />
            Novo evento
          </button>
        </div>
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
          className="size-2 rounded-full bg-(--duocal-primary) animate-pulse"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function primeiroNome(nome: string | null) {
  return nome?.trim().split(/\s+/)[0] ?? 'Membro'
}
