import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flag,
  Heart,
  ListTodo,
  Plus,
  Sparkles,
  TrendingUp,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  eventosHoje,
  proximoEvento,
  useBuscarEvento,
  useEditarEvento,
  type AtualizarEventoPayload,
  type CategoriaEvento,
  type CriarEventoPayload,
  type EventoWorkspace,
  type MembroWorkspace,
  type PrioridadeTarefa,
  type StatusTarefa,
  type SyncState,
  type TarefaKanban,
  type WorkspaceAtual,
} from '../../hooks'
import { EventDetailSheet, EventFormSheet } from '../events'
import { PRIORIDADE_CONFIG, STATUS_CONFIG } from '../kanban/kanbanConfig'

const DIA_VISIVEL_INICIO = 6 * 60
const DIA_VISIVEL_FIM = 22 * 60
const STATUS_ORDER: StatusTarefa[] = [
  'A_FAZER',
  'EM_ANDAMENTO',
  'PLANEJADO',
  'CONCLUIDO',
]
const PRIORIDADE_ORDER: PrioridadeTarefa[] = ['BAIXA', 'MEDIA', 'ALTA']

type HomeDashboardProps = {
  workspace: WorkspaceAtual
  eventos: EventoWorkspace[]
  tarefas: TarefaKanban[]
  membros: MembroWorkspace[]
  categorias: CategoriaEvento[]
  usuarioAtualId: string
  isSavingEvento: boolean
  isLoadingEventos: boolean
  isLoadingTarefas: boolean
  isOnline: boolean
  pendingCount: number
  syncState: SyncState
  showEventForm: boolean
  onOpenEventForm: () => void
  onCloseEventForm: () => void
  onSaveEvento: (payload: CriarEventoPayload) => Promise<void>
}

export function HomeDashboard({
  workspace,
  eventos,
  tarefas,
  membros,
  categorias,
  usuarioAtualId,
  isSavingEvento,
  isLoadingEventos,
  isLoadingTarefas,
  isOnline,
  pendingCount,
  syncState,
  showEventForm,
  onOpenEventForm,
  onCloseEventForm,
  onSaveEvento,
}: HomeDashboardProps) {
  const workspaceId = workspace.workspace.id
  const [eventoSelecionado, setEventoSelecionado] =
    useState<EventoWorkspace | null>(null)
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

  const hoje = eventosHoje(eventos)
  const proximo = proximoEvento(eventos)
  const proximosEventos = getProximosEventos(eventos)
  const focoTarefas = getTarefasEmFoco(tarefas)
  const resumoTempo = getResumoTempoLivre(hoje)
  const tarefasPendentes = tarefas.filter((t) => t.status !== 'CONCLUIDO')
  const tarefasHoje = tarefasPendentes.filter((t) => isToday(t.dt_prazo))
  const eventosCompartilhados = hoje.filter(
    (evento) => evento.participantes.length > 1,
  ).length
  const responsaveisEventos = getEventosPorResponsavel(hoje, membros)
  const statusTarefas = countByStatus(tarefas)
  const prioridades = countByPrioridade(tarefasPendentes)

  return (
    <>
      <div className="space-y-4 overflow-x-hidden pb-16">
        <HomeHeroBanner
          workspace={workspace}
          membros={membros}
          isOnline={isOnline}
          pendingCount={pendingCount}
          syncState={syncState}
        />

        <section className="space-y-3">
          <SectionHeader title="Resumo do dia" />
          <div className="grid grid-cols-2 gap-3">
            <HomeMetricCard
              icon={<CalendarDays className="size-4" />}
              label="Próximo evento"
              value={
                isLoadingEventos
                  ? '...'
                  : proximo
                    ? tempoAteEvento(proximo.dt_inicio)
                    : 'Livre'
              }
              description={
                proximo
                  ? `${formatHorario(proximo.dt_inicio)} · ${proximo.nm_evento}`
                  : 'Nenhum compromisso'
              }
              tone="primary"
            />
            <HomeMetricCard
              icon={<Heart className="size-4" />}
              label="Tempo livre"
              value={
                isLoadingEventos
                  ? '...'
                  : formatMinutos(resumoTempo.totalLivreMinutos)
              }
              description="juntos hoje"
              tone="violet"
            />
            <HomeMetricCard
              icon={<Clock className="size-4" />}
              label="Eventos hoje"
              value={isLoadingEventos ? '...' : String(hoje.length)}
              description={`${eventosCompartilhados} compartilhados`}
              tone="success"
            />
            <HomeMetricCard
              icon={<ListTodo className="size-4" />}
              label="Tarefas"
              value={isLoadingTarefas ? '...' : String(tarefasPendentes.length)}
              description={`${tarefasHoje.length} vencem hoje`}
              tone="warning"
            />
          </div>
        </section>

        <TodayTimeChart resumo={resumoTempo} isLoading={isLoadingEventos} />

        <section className="grid gap-3 min-[720px]:grid-cols-3">
          <MiniIndicatorCard
            title="Responsáveis"
            description="Eventos de hoje"
            items={responsaveisEventos}
          />
          <MiniIndicatorCard
            title="Tarefas"
            description="Status do quadro"
            items={STATUS_ORDER.map((status) => ({
              key: status,
              label: STATUS_CONFIG[status].label,
              value: statusTarefas[status],
              color: STATUS_CONFIG[status].cor,
            }))}
          />
          <MiniIndicatorCard
            title="Prioridade"
            description="Pendências"
            items={PRIORIDADE_ORDER.map((prioridade) => ({
              key: prioridade,
              label: PRIORIDADE_CONFIG[prioridade].label,
              value: prioridades[prioridade],
              color: PRIORIDADE_CONFIG[prioridade].cor,
            }))}
          />
        </section>

        <UpcomingEvents
          eventos={proximosEventos}
          isLoading={isLoadingEventos}
          onSelect={setEventoSelecionado}
        />

        <TodayFocusTasks tarefas={focoTarefas} isLoading={isLoadingTarefas} />
      </div>

      <button
        aria-label="Criar novo evento"
        className="fixed bottom-[calc(92px+env(safe-area-inset-bottom))] right-[max(1.25rem,calc((100vw-420px)/2+1.25rem))] z-20 inline-flex min-h-12 max-w-[calc(100vw-2.5rem)] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--duocal-primary)] to-[var(--duocal-violet)] px-5 text-sm font-black text-white shadow-[0_18px_34px_rgba(84,102,241,0.28)] transition active:scale-[0.98]"
        onClick={onOpenEventForm}
        type="button"
      >
        <Plus className="size-4" />
        Novo evento
      </button>

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
                className="size-2 animate-pulse rounded-full bg-(--duocal-primary)"
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
    </>
  )
}

function HomeHeroBanner({
  workspace,
  membros,
  isOnline,
  pendingCount,
  syncState,
}: {
  workspace: WorkspaceAtual
  membros: MembroWorkspace[]
  isOnline: boolean
  pendingCount: number
  syncState: SyncState
}) {
  const sync = getSyncStatus(isOnline, pendingCount, syncState)

  return (
    <section className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[var(--duocal-primary)] via-[#7A67F6] to-[var(--duocal-violet)] p-5 text-white shadow-[0_18px_50px_rgba(84,102,241,0.22)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/16 px-3 py-1 text-[11px] font-bold text-white/88">
            <Sparkles className="size-3.5" />
            {workspace.workspace.nm_workspace}
          </div>
          <h2 className="mt-3 text-xl font-black leading-tight">
            Organize o dia de vocês com leveza.
          </h2>
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/76">
            {workspace.workspace.ds_slogan ||
              'Hoje é um bom dia para sincronizar a rotina.'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex justify-end -space-x-2">
            {membros.slice(0, 3).map((m) => (
              <MemberAvatar key={m.usuario_id} nome={m.nm_usuario} />
            ))}
          </div>
          <p className="mt-2 text-[11px] font-semibold text-white/68">
            {workspace.total_membros === 1
              ? '1 membro'
              : `${workspace.total_membros} membros`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/14 px-3.5 py-2.5">
        <span
          className="grid size-7 shrink-0 place-items-center rounded-full bg-white/14"
          title={sync.label}
        >
          {sync.icon}
        </span>
        <p className="min-w-0 truncate text-xs font-semibold text-white/88">
          {sync.label}
        </p>
      </div>
    </section>
  )
}

function HomeMetricCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string
  description: string
  tone: 'primary' | 'violet' | 'success' | 'warning'
}) {
  const toneClasses = {
    primary: 'bg-[rgba(84,102,241,0.10)] text-(--duocal-primary)',
    violet: 'bg-[rgba(182,109,255,0.12)] text-(--duocal-violet)',
    success: 'bg-[rgba(53,207,165,0.12)] text-(--duocal-success)',
    warning: 'bg-[rgba(255,176,32,0.14)] text-(--duocal-warning)',
  }

  return (
    <section className="min-w-0 rounded-[24px] border border-[rgba(229,231,240,0.84)] bg-white p-4 shadow-[0_12px_30px_rgba(17,20,74,0.05)]">
      <div
        className={`grid size-8 place-items-center rounded-2xl ${toneClasses[tone]}`}
      >
        {icon}
      </div>
      <p className="mt-3 truncate text-[10px] font-black uppercase tracking-[0.12em] text-(--duocal-muted)">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-black leading-tight text-(--duocal-text)">
        {value}
      </p>
      <p className="mt-1 line-clamp-1 text-xs font-medium text-(--duocal-muted)">
        {description}
      </p>
    </section>
  )
}

function TodayTimeChart({
  resumo,
  isLoading,
}: {
  resumo: ResumoTempoLivre
  isLoading: boolean
}) {
  return (
    <section className="rounded-[28px] border border-[rgba(229,231,240,0.84)] bg-white p-5 shadow-[0_14px_34px_rgba(17,20,74,0.06)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-black text-(--duocal-text)">
            Nosso tempo
          </h3>
          <p className="mt-1 text-2xl font-black leading-tight text-(--duocal-text)">
            {isLoading
              ? 'Calculando...'
              : `${formatMinutos(resumo.totalLivreMinutos)} livres juntos`}
          </p>
        </div>
        <Link
          to="/agenda"
          className="rounded-full bg-(--duocal-surface-soft) px-3 py-1.5 text-xs font-bold text-(--duocal-primary)"
        >
          ver
        </Link>
      </div>

      <div className="mt-5">
        <div className="relative h-4 overflow-hidden rounded-full bg-[rgba(84,102,241,0.10)]">
          {resumo.ocupados.map((segmento) => (
            <span
              aria-hidden
              className="absolute inset-y-0 rounded-full bg-[rgba(255,90,122,0.42)]"
              key={`${segmento.inicio}-${segmento.fim}`}
              style={{
                left: `${segmento.left}%`,
                width: `${segmento.width}%`,
              }}
            />
          ))}
          {resumo.livres.map((janela) => (
            <span
              aria-hidden
              className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[var(--duocal-success)] to-[var(--duocal-primary)]"
              key={`${janela.inicio}-${janela.fim}`}
              style={{
                left: `${janela.left}%`,
                width: `${janela.width}%`,
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-(--duocal-muted)">
          <span>06:00</span>
          <span>22:00</span>
        </div>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-5 text-(--duocal-muted)">
        {isLoading ? 'Carregando janelas do dia.' : resumo.descricao}
      </p>
    </section>
  )
}

function MiniIndicatorCard({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: IndicatorItem[]
}) {
  const total = items.reduce((acc, item) => acc + item.value, 0)

  return (
    <section className="min-w-0 rounded-[24px] border border-[rgba(229,231,240,0.84)] bg-white p-4 shadow-[0_12px_30px_rgba(17,20,74,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-black text-(--duocal-text)">
            {title}
          </h3>
          <p className="mt-0.5 truncate text-xs text-(--duocal-muted)">
            {description}
          </p>
        </div>
        <TrendingUp className="size-4 shrink-0 text-(--duocal-primary)" />
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-(--duocal-surface-soft)">
        {items.map((item) => (
          <span
            aria-hidden
            key={item.key}
            className="h-full"
            style={{
              backgroundColor: item.color,
              width: `${total > 0 ? (item.value / total) * 100 : 100 / items.length}%`,
            }}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
        {items.map((item) => (
          <span
            className="inline-flex max-w-full items-center gap-1.5 text-[11px] font-semibold text-(--duocal-muted)"
            key={item.key}
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate">{item.label}</span>
            <span className="font-black text-(--duocal-text)">
              {item.value}
            </span>
          </span>
        ))}
      </div>
    </section>
  )
}

function UpcomingEvents({
  eventos,
  isLoading,
  onSelect,
}: {
  eventos: EventoWorkspace[]
  isLoading: boolean
  onSelect: (evento: EventoWorkspace) => void
}) {
  return (
    <section className="rounded-[28px] border border-[rgba(229,231,240,0.84)] bg-white p-5 shadow-[0_14px_34px_rgba(17,20,74,0.06)]">
      <SectionHeader title="Próximos compromissos" actionLabel="Ver tudo" to="/agenda" />

      {isLoading ? (
        <LoadingDots />
      ) : eventos.length === 0 ? (
        <EmptyInline
          icon={<CalendarDays className="size-5" />}
          title="Nenhum compromisso próximo"
          description="Quando houver eventos, eles aparecem aqui."
        />
      ) : (
        <div className="mt-4 divide-y divide-(--duocal-border)">
          {eventos.map((evento) => (
            <button
              className="flex w-full min-w-0 items-center gap-3 py-3 text-left"
              key={evento.id}
              onClick={() => onSelect(evento)}
              type="button"
            >
              <div className="w-12 shrink-0 text-center">
                <p className="text-base font-black leading-none text-(--duocal-text)">
                  {formatHorario(evento.dt_inicio)}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-(--duocal-muted)">
                  {formatDuracaoEvento(evento)}
                </p>
              </div>
              <span
                aria-hidden
                className="h-11 w-1 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    evento.cd_cor_categoria || 'var(--duocal-primary)',
                }}
              />
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-black text-(--duocal-text)">
                  {evento.nm_evento}
                </h4>
                <p className="mt-1 truncate text-xs font-medium text-(--duocal-muted)">
                  {evento.nm_categoria || 'Sem categoria'}
                </p>
              </div>
              <div className="flex shrink-0 -space-x-2">
                {evento.participantes.slice(0, 2).map((p) => (
                  <SmallAvatar key={p.usuario_id} nome={p.nm_usuario} />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

function TodayFocusTasks({
  tarefas,
  isLoading,
}: {
  tarefas: TarefaKanban[]
  isLoading: boolean
}) {
  return (
    <section className="rounded-[28px] border border-[rgba(229,231,240,0.84)] bg-white p-5 shadow-[0_14px_34px_rgba(17,20,74,0.06)]">
      <SectionHeader title="Em foco hoje" actionLabel="Ver tudo" to="/kanban" />

      {isLoading ? (
        <LoadingDots />
      ) : tarefas.length === 0 ? (
        <EmptyInline
          icon={<ListTodo className="size-5" />}
          title="Sem tarefas em foco"
          description="Prioridades e vencimentos aparecem aqui."
        />
      ) : (
        <div className="mt-4 grid gap-3 min-[720px]:grid-cols-2">
          {tarefas.map((tarefa) => {
            const prioridade = PRIORIDADE_CONFIG[tarefa.prioridade]
            const status = STATUS_CONFIG[tarefa.status]
            return (
              <article
                className="relative min-w-0 overflow-hidden rounded-[22px] border border-(--duocal-border) bg-(--duocal-surface-soft) p-4"
                key={tarefa.id}
              >
                <span
                  aria-hidden
                  className="absolute left-0 top-4 h-10 w-1 rounded-r-full"
                  style={{
                    backgroundColor:
                      tarefa.cd_cor_categoria || prioridade.cor,
                  }}
                />
                <div className="flex min-w-0 items-start justify-between gap-3 pl-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className="max-w-[9rem] truncate rounded-full px-2 py-0.5 text-[10px] font-black"
                        style={{
                          backgroundColor: `${tarefa.cd_cor_categoria || prioridade.cor}18`,
                          color: tarefa.cd_cor_categoria || prioridade.cor,
                        }}
                      >
                        {tarefa.nm_categoria || 'Geral'}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-black"
                        style={{
                          backgroundColor: `${prioridade.cor}18`,
                          color: prioridade.cor,
                        }}
                      >
                        {prioridade.label}
                      </span>
                    </div>
                    <h4 className="mt-2 line-clamp-2 break-words text-sm font-black leading-snug text-(--duocal-text)">
                      {tarefa.titulo}
                    </h4>
                  </div>
                  <Flag
                    className="size-4 shrink-0"
                    style={{ color: prioridade.cor }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 pl-2 text-[11px] font-semibold text-(--duocal-muted)">
                  <span className="truncate">
                    {tarefa.nm_responsavel || 'Sem responsável'}
                  </span>
                  <span>{formatPrazo(tarefa.dt_prazo)}</span>
                  <span style={{ color: status.cor }}>{status.label}</span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function SectionHeader({
  title,
  actionLabel,
  to,
}: {
  title: string
  actionLabel?: string
  to?: '/agenda' | '/kanban'
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <h3 className="min-w-0 truncate text-base font-black text-(--duocal-text)">
        {title}
      </h3>
      {actionLabel && to ? (
        <Link
          to={to}
          className="shrink-0 text-xs font-bold text-(--duocal-primary)"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="mt-4 flex items-center gap-1.5 py-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-pulse rounded-full bg-(--duocal-primary)"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

function EmptyInline({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-[22px] bg-(--duocal-surface-soft) px-4 py-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-(--duocal-primary)">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-(--duocal-text)">
          {title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-(--duocal-muted)">
          {description}
        </p>
      </div>
    </div>
  )
}

function MemberAvatar({ nome }: { nome: string | null }) {
  return (
    <div className="grid size-8 place-items-center rounded-full bg-white/30 text-xs font-black text-white ring-2 ring-white/30">
      {getInitials(nome)}
    </div>
  )
}

function SmallAvatar({ nome }: { nome: string | null }) {
  return (
    <div className="grid size-7 place-items-center rounded-full bg-white text-[10px] font-black text-(--duocal-primary) ring-2 ring-white shadow-[0_4px_12px_rgba(17,20,74,0.08)]">
      {getInitials(nome)}
    </div>
  )
}

type IndicatorItem = {
  key: string
  label: string
  value: number
  color: string
}

type TimeSegment = {
  inicio: number
  fim: number
  left: number
  width: number
}

type ResumoTempoLivre = {
  totalLivreMinutos: number
  livres: TimeSegment[]
  ocupados: TimeSegment[]
  descricao: string
}

function getSyncStatus(
  isOnline: boolean,
  pendingCount: number,
  syncState: SyncState,
) {
  if (!isOnline) {
    return {
      label:
        pendingCount > 0
          ? `Offline · ${pendingCount} alteração${pendingCount > 1 ? 'es' : ''} na fila`
          : 'Offline — alterações serão sincronizadas depois',
      icon: <WifiOff className="size-3.5" />,
    }
  }

  if (syncState === 'syncing') {
    return {
      label: 'Sincronizando...',
      icon: <Wifi className="size-3.5 animate-pulse" />,
    }
  }

  if (syncState === 'error') {
    return {
      label: 'Algumas alterações aguardam nova tentativa',
      icon: <AlertCircle className="size-3.5" />,
    }
  }

  if (pendingCount > 0) {
    return {
      label: `${pendingCount} alteração${pendingCount > 1 ? 'es' : ''} pendente${pendingCount > 1 ? 's' : ''}`,
      icon: <Clock className="size-3.5" />,
    }
  }

  return {
    label: 'Sincronizado há instantes',
    icon: <CheckCircle2 className="size-3.5" />,
  }
}

function getResumoTempoLivre(eventos: EventoWorkspace[]): ResumoTempoLivre {
  const totalDia = DIA_VISIVEL_FIM - DIA_VISIVEL_INICIO
  const intervalos = eventos
    .map(getVisibleDayInterval)
    .filter((intervalo): intervalo is { inicio: number; fim: number } =>
      Boolean(intervalo),
    )
    .sort((a, b) => a.inicio - b.inicio)

  const ocupados = mergeIntervals(intervalos)
  const livres: { inicio: number; fim: number }[] = []
  let cursor = DIA_VISIVEL_INICIO

  for (const ocupado of ocupados) {
    if (ocupado.inicio > cursor) {
      livres.push({ inicio: cursor, fim: ocupado.inicio })
    }
    cursor = Math.max(cursor, ocupado.fim)
  }

  if (cursor < DIA_VISIVEL_FIM) {
    livres.push({ inicio: cursor, fim: DIA_VISIVEL_FIM })
  }

  const livresComPosicao = livres.map((janela) => withPosition(janela, totalDia))
  const ocupadosComPosicao = ocupados.map((janela) => withPosition(janela, totalDia))
  const totalLivreMinutos = livres.reduce(
    (acc, janela) => acc + janela.fim - janela.inicio,
    0,
  )

  return {
    totalLivreMinutos,
    livres: livresComPosicao,
    ocupados: ocupadosComPosicao,
    descricao: getDescricaoJanelasLivres(livres),
  }
}

function getVisibleDayInterval(evento: EventoWorkspace) {
  if (evento.fl_dia_todo) {
    return { inicio: DIA_VISIVEL_INICIO, fim: DIA_VISIVEL_FIM }
  }

  const inicioDia = new Date()
  inicioDia.setHours(0, 0, 0, 0)
  const inicioVisivel = new Date(
    inicioDia.getTime() + DIA_VISIVEL_INICIO * 60_000,
  )
  const fimVisivel = new Date(inicioDia.getTime() + DIA_VISIVEL_FIM * 60_000)
  const inicio = Math.max(
    new Date(evento.dt_inicio).getTime(),
    inicioVisivel.getTime(),
  )
  const fim = Math.min(new Date(evento.dt_fim).getTime(), fimVisivel.getTime())

  if (fim <= inicio) return null

  return {
    inicio: Math.round((inicio - inicioDia.getTime()) / 60_000),
    fim: Math.round((fim - inicioDia.getTime()) / 60_000),
  }
}

function getDescricaoJanelasLivres(janelas: { inicio: number; fim: number }[]) {
  const janelasLongas = janelas.filter(
    (janela) => janela.fim - janela.inicio >= 30,
  )

  if (janelasLongas.length === 0) {
    return 'Sem janelas livres longas entre 06:00 e 22:00.'
  }

  const horarios = janelasLongas
    .slice(0, 2)
    .map((janela) => formatMinutesAsTime(janela.inicio))
    .join(' e ')

  return `Janelas livres às ${horarios}`
}

function getProximosEventos(eventos: EventoWorkspace[]) {
  const agora = new Date()

  return eventos
    .filter((evento) => new Date(evento.dt_fim) > agora)
    .sort(
      (a, b) =>
        new Date(a.dt_inicio).getTime() - new Date(b.dt_inicio).getTime(),
    )
    .slice(0, 5)
}

function getTarefasEmFoco(tarefas: TarefaKanban[]) {
  const prioridadePeso: Record<PrioridadeTarefa, number> = {
    ALTA: 0,
    MEDIA: 1,
    BAIXA: 2,
  }

  return tarefas
    .filter((tarefa) => tarefa.status !== 'CONCLUIDO')
    .sort((a, b) => {
      const aHoje = isToday(a.dt_prazo) ? 0 : 1
      const bHoje = isToday(b.dt_prazo) ? 0 : 1
      if (aHoje !== bHoje) return aHoje - bHoje

      const prioridade = prioridadePeso[a.prioridade] - prioridadePeso[b.prioridade]
      if (prioridade !== 0) return prioridade

      return getDateTime(a.dt_prazo) - getDateTime(b.dt_prazo)
    })
    .slice(0, 4)
}

function getEventosPorResponsavel(
  eventos: EventoWorkspace[],
  membros: MembroWorkspace[],
): IndicatorItem[] {
  const fallbackColors = [
    'var(--duocal-primary)',
    'var(--duocal-athina)',
    'var(--duocal-casal)',
  ]
  const base = membros.slice(0, 2).map((membro, index) => ({
    key: membro.usuario_id,
    label: firstName(membro.nm_usuario) || `Pessoa ${index + 1}`,
    value: 0,
    color: fallbackColors[index] ?? 'var(--duocal-primary)',
  }))
  const casal = {
    key: 'casal',
    label: 'Casal',
    value: 0,
    color: 'var(--duocal-casal)',
  }

  for (const evento of eventos) {
    if (evento.participantes.length > 1) {
      casal.value += 1
      continue
    }

    const responsavelId =
      evento.participantes.find((p) => p.fl_responsavel_principal)?.usuario_id ||
      evento.participantes[0]?.usuario_id
    const item = base.find((membro) => membro.key === responsavelId)

    if (item) {
      item.value += 1
    } else {
      casal.value += 1
    }
  }

  const items = [...base, casal]
  return items.length > 0
    ? items
    : [{ key: 'casal', label: 'Casal', value: 0, color: 'var(--duocal-casal)' }]
}

function countByStatus(tarefas: TarefaKanban[]) {
  return STATUS_ORDER.reduce(
    (acc, status) => {
      acc[status] = tarefas.filter((tarefa) => tarefa.status === status).length
      return acc
    },
    {} as Record<StatusTarefa, number>,
  )
}

function countByPrioridade(tarefas: TarefaKanban[]) {
  return PRIORIDADE_ORDER.reduce(
    (acc, prioridade) => {
      acc[prioridade] = tarefas.filter(
        (tarefa) => tarefa.prioridade === prioridade,
      ).length
      return acc
    },
    {} as Record<PrioridadeTarefa, number>,
  )
}

function mergeIntervals(intervalos: { inicio: number; fim: number }[]) {
  const merged: { inicio: number; fim: number }[] = []

  for (const intervalo of intervalos) {
    const ultimo = merged.at(-1)
    if (!ultimo || intervalo.inicio > ultimo.fim) {
      merged.push({ ...intervalo })
      continue
    }

    ultimo.fim = Math.max(ultimo.fim, intervalo.fim)
  }

  return merged
}

function withPosition(
  intervalo: { inicio: number; fim: number },
  totalDia: number,
): TimeSegment {
  return {
    ...intervalo,
    left: ((intervalo.inicio - DIA_VISIVEL_INICIO) / totalDia) * 100,
    width: Math.max(((intervalo.fim - intervalo.inicio) / totalDia) * 100, 0.8),
  }
}

function formatHorario(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuracaoEvento(evento: EventoWorkspace) {
  const inicio = new Date(evento.dt_inicio).getTime()
  const fim = new Date(evento.dt_fim).getTime()
  const minutos = Math.max(Math.round((fim - inicio) / 60_000), 0)
  return formatMinutos(minutos)
}

function formatPrazo(iso: string | null) {
  if (!iso) return 'Sem prazo'
  if (isToday(iso)) return 'Hoje'

  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function tempoAteEvento(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()

  if (diff <= 0) return 'agora'

  return `em ${formatMinutos(Math.round(diff / 60_000))}`
}

function formatMinutos(totalMinutos: number) {
  if (totalMinutos <= 0) return '0m'

  const horas = Math.floor(totalMinutos / 60)
  const minutos = totalMinutos % 60

  if (horas === 0) return `${minutos}m`
  if (minutos === 0) return `${horas}h`

  return `${horas}h ${minutos}m`
}

function formatMinutesAsTime(total: number) {
  const horas = Math.floor(total / 60)
  const minutos = total % 60
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
}

function isToday(iso: string | null) {
  if (!iso) return false
  const data = new Date(iso)
  const hoje = new Date()

  return (
    data.getFullYear() === hoje.getFullYear() &&
    data.getMonth() === hoje.getMonth() &&
    data.getDate() === hoje.getDate()
  )
}

function getDateTime(iso: string | null) {
  return iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER
}

function getInitials(nome: string | null) {
  return nome
    ? nome
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
    : '?'
}

function firstName(nome: string | null) {
  return nome?.trim().split(/\s+/)[0] ?? ''
}
