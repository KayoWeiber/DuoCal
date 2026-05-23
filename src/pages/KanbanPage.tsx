import { useEffect, useMemo, useState } from 'react'
import { Columns3, Plus, Search, SlidersHorizontal } from 'lucide-react'
import {
  BottomNavigation,
  OfflineBar,
  ProfileSetupModal,
  VersionOutdatedModal,
} from '../components'
import {
  useAlterarStatusTarefa,
  useAtualizarTarefa,
  useAuthSession,
  useCategoriasEvento,
  useCriarTarefa,
  useExcluirTarefa,
  useMembrosWorkspace,
  useMeuPerfil,
  useSyncQueue,
  useTarefasKanban,
  useUnreadNotificationCount,
  useWorkspaceAtual,
} from '../hooks'
import { isVersionOutdatedError } from '../lib'
import type {
  AtualizarTarefaPayload,
  CriarTarefaPayload,
  MeuPerfil,
  StatusTarefa,
  TarefaKanban,
} from '../hooks'
import { KanbanTaskCard } from '../components/kanban/KanbanTaskCard'
import { KanbanTaskFormSheet } from '../components/kanban/KanbanTaskFormSheet'
import { STATUS_CONFIG } from '../components/kanban/kanbanConfig'

type FiltroStatus = StatusTarefa | 'TODOS'

const STATUS_ORDEM: StatusTarefa[] = ['A_FAZER', 'EM_ANDAMENTO', 'PLANEJADO', 'CONCLUIDO']

function filtrarTarefas(
  tarefas: TarefaKanban[],
  filtro: FiltroStatus,
  busca: string,
): TarefaKanban[] {
  const termo = busca.trim().toLocaleLowerCase('pt-BR')

  return tarefas.filter((tarefa) => {
    const statusOk = filtro === 'TODOS' || tarefa.status === filtro
    if (!statusOk) return false
    if (!termo) return true

    return [
      tarefa.titulo,
      tarefa.descricao,
      tarefa.nm_categoria,
      tarefa.nm_responsavel,
    ]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase('pt-BR').includes(termo))
  })
}

function contarPorStatus(tarefas: TarefaKanban[]) {
  return STATUS_ORDEM.reduce<Record<StatusTarefa, number>>((acc, status) => {
    acc[status] = tarefas.filter((tarefa) => tarefa.status === status).length
    return acc
  }, {
    A_FAZER: 0,
    EM_ANDAMENTO: 0,
    PLANEJADO: 0,
    CONCLUIDO: 0,
  })
}

function KanbanHeader({
  total,
  buscaAberta,
  onToggleBusca,
}: {
  total: number
  buscaAberta: boolean
  onToggleBusca: () => void
}) {
  return (
    <header className="shrink-0 px-5 pt-3 pb-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-(--duocal-muted)">
            {total} {total === 1 ? 'tarefa no quadro' : 'tarefas no quadro'}
          </p>
          <h1 className="mt-0.5 text-[26px] font-black leading-tight text-(--duocal-text)">
            Kanban
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={buscaAberta ? 'Fechar busca' : 'Buscar tarefa'}
            onClick={onToggleBusca}
            className="grid size-9 place-items-center rounded-full border border-(--duocal-border) bg-white text-(--duocal-muted) shadow-[0_4px_14px_rgba(17,20,74,0.06)] transition hover:text-(--duocal-primary)"
          >
            <Search className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Filtrar tarefas"
            className="grid size-9 place-items-center rounded-full border border-(--duocal-border) bg-white text-(--duocal-muted) shadow-[0_4px_14px_rgba(17,20,74,0.06)] transition hover:text-(--duocal-primary)"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

function StatusFilterChips({
  counts,
  filtroAtivo,
  onFiltrar,
}: {
  counts: Record<StatusTarefa, number>
  filtroAtivo: FiltroStatus
  onFiltrar: (status: FiltroStatus) => void
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {STATUS_ORDEM.map((status) => {
        const cfg = STATUS_CONFIG[status]
        const ativo = filtroAtivo === status

        return (
          <button
            key={status}
            type="button"
            onClick={() => onFiltrar(ativo ? 'TODOS' : status)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-black transition active:scale-95"
            style={{
              backgroundColor: ativo ? cfg.cor : '#fff',
              borderColor: ativo ? cfg.cor : 'var(--duocal-border)',
              color: ativo ? '#fff' : 'var(--duocal-text)',
              boxShadow: ativo ? `0 8px 18px ${cfg.cor}30` : '0 4px 14px rgba(17,20,74,0.04)',
            }}
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: ativo ? '#fff' : cfg.cor }}
            />
            <span>{cfg.label}</span>
            <span
              className="grid min-w-4 place-items-center rounded-full px-1 text-[9px]"
              style={{
                backgroundColor: ativo ? 'rgba(255,255,255,0.22)' : cfg.bg,
                color: ativo ? '#fff' : cfg.cor,
              }}
            >
              {counts[status]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function StatusSummaryCards({
  counts,
  filtroAtivo,
  onFiltrar,
}: {
  counts: Record<StatusTarefa, number>
  filtroAtivo: FiltroStatus
  onFiltrar: (status: FiltroStatus) => void
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {STATUS_ORDEM.map((status) => {
        const cfg = STATUS_CONFIG[status]
        const ativo = filtroAtivo === status

        return (
          <button
            key={status}
            type="button"
            onClick={() => onFiltrar(ativo ? 'TODOS' : status)}
            className="min-w-[88px] rounded-2xl border bg-white px-3 py-2.5 text-left shadow-[0_10px_24px_rgba(17,20,74,0.05)] transition active:scale-95"
            style={{
              borderColor: ativo ? cfg.cor : 'var(--duocal-border)',
              backgroundColor: ativo ? cfg.bg : '#fff',
            }}
          >
            <span className="block text-[10px] font-black uppercase" style={{ color: cfg.cor }}>
              {cfg.label}
            </span>
            <span className="mt-1 block text-2xl font-black text-(--duocal-text)">
              {counts[status]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function LoadingKanban() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-3xl bg-white shadow-[0_10px_24px_rgba(17,20,74,0.04)]"
        />
      ))}
    </div>
  )
}

function EmptyKanban({ onNova }: { onNova: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
      <div className="grid size-16 place-items-center rounded-3xl bg-white shadow-[0_12px_28px_rgba(17,20,74,0.06)]">
        <Columns3 className="size-8 text-(--duocal-primary) opacity-70" />
      </div>
      <div>
        <p className="font-bold text-(--duocal-text)">Nenhuma tarefa ainda</p>
        <p className="mt-1 text-sm text-(--duocal-muted)">
          Crie uma tarefa para organizar o que vocês têm a fazer.
        </p>
      </div>
      <button
        type="button"
        onClick={onNova}
        className="rounded-2xl bg-(--duocal-primary) px-6 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(84,102,241,0.24)]"
      >
        Criar primeira tarefa
      </button>
    </div>
  )
}

export function KanbanPage() {
  const { session, isLoading: isSessionLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil: MeuPerfil | null = perfilQuery.data ?? null
  const workspaceQuery = useWorkspaceAtual(perfil)
  const workspace = workspaceQuery.data ?? null
  const workspaceId = workspace?.workspace.id ?? null
  const { unreadCount } = useUnreadNotificationCount(perfil)
  const { isOnline, syncState, pendingCount } = useSyncQueue(workspaceId)

  const { data: tarefas = [], isLoading, isError } = useTarefasKanban(workspaceId)
  const { data: membros = [] } = useMembrosWorkspace(workspaceId)
  const { data: categorias = [] } = useCategoriasEvento(workspaceId)

  const criarTarefa = useCriarTarefa()
  const atualizarTarefa = useAtualizarTarefa()
  const alterarStatus = useAlterarStatusTarefa()
  const excluirTarefa = useExcluirTarefa()

  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatus>('TODOS')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [busca, setBusca] = useState('')
  const [formAberto, setFormAberto] = useState(false)
  const [tarefaEditando, setTarefaEditando] = useState<TarefaKanban | null>(null)
  const [versaoDesatualizada, setVersaoDesatualizada] = useState(false)

  useEffect(() => {
    if (!isSessionLoading && !session) window.location.replace('/login')
  }, [isSessionLoading, session])

  const perfilIncompleto = Boolean(perfil && (!perfil.fl_perfil_completo || !perfil.nm_usuario))
  const counts = useMemo(() => contarPorStatus(tarefas), [tarefas])
  const tarefasFiltradas = useMemo(
    () => filtrarTarefas(tarefas, filtroAtivo, busca),
    [tarefas, filtroAtivo, busca],
  )

  function abrirNovaTarefa() {
    setTarefaEditando(null)
    setFormAberto(true)
  }

  function abrirEdicao(tarefa: TarefaKanban) {
    setTarefaEditando(tarefa)
    setFormAberto(true)
  }

  function fecharForm() {
    setFormAberto(false)
    setTarefaEditando(null)
  }

  async function handleSave(payload: CriarTarefaPayload | AtualizarTarefaPayload) {
    try {
      if ('tarefaId' in payload) {
        await atualizarTarefa.mutateAsync(payload as AtualizarTarefaPayload)
      } else {
        await criarTarefa.mutateAsync(payload)
      }
    } catch (error) {
      if (isVersionOutdatedError(error)) setVersaoDesatualizada(true)
      throw error
    }
  }

  async function handleExcluir() {
    if (!tarefaEditando || !workspaceId) return
    try {
      await excluirTarefa.mutateAsync({
        tarefaId: tarefaEditando.id,
        workspaceId,
      })
      fecharForm()
    } catch (error) {
      if (isVersionOutdatedError(error)) setVersaoDesatualizada(true)
    }
  }

  async function handleAlterarStatus(tarefa: TarefaKanban, novoStatus: StatusTarefa) {
    if (!workspaceId || tarefa.status === novoStatus) return
    try {
      await alterarStatus.mutateAsync({
        tarefaId: tarefa.id,
        workspaceId,
        status: novoStatus,
      })
    } catch (error) {
      if (isVersionOutdatedError(error)) setVersaoDesatualizada(true)
    }
  }

  const isSaving =
    criarTarefa.isPending || atualizarTarefa.isPending || excluirTarefa.isPending

  return (
    <>
      <div
        className="duocal-app-shell fixed inset-x-0 top-0 flex h-dvh flex-col overflow-hidden bg-(--duocal-surface-soft)"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <KanbanHeader
          total={tarefas.length}
          buscaAberta={buscaAberta}
          onToggleBusca={() => setBuscaAberta((value) => !value)}
        />

        {buscaAberta ? (
          <div className="shrink-0 px-5 pb-2">
            <input
              className="duocal-input h-11 rounded-2xl bg-white text-sm"
              placeholder="Buscar tarefa, categoria ou responsável"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              autoFocus
            />
          </div>
        ) : null}

        {(!isOnline || syncState !== 'idle' || pendingCount > 0) && (
          <div className="shrink-0 px-5 pb-2">
            <OfflineBar isOnline={isOnline} syncState={syncState} pendingCount={pendingCount} />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-[calc(9rem+env(safe-area-inset-bottom,0px))] pt-1 scrollbar-hide">
          <div className="space-y-3">
            <StatusFilterChips
              counts={counts}
              filtroAtivo={filtroAtivo}
              onFiltrar={setFiltroAtivo}
            />

            <StatusSummaryCards
              counts={counts}
              filtroAtivo={filtroAtivo}
              onFiltrar={setFiltroAtivo}
            />

            {isLoading ? (
              <LoadingKanban />
            ) : isError ? (
              <div className="rounded-3xl bg-red-50 p-4 text-center text-sm font-semibold text-red-600">
                Erro ao carregar tarefas. Tente novamente.
              </div>
            ) : tarefas.length === 0 ? (
              <EmptyKanban onNova={abrirNovaTarefa} />
            ) : tarefasFiltradas.length === 0 ? (
              <div className="rounded-3xl bg-white px-6 py-8 text-center text-sm font-semibold text-(--duocal-muted)">
                Nenhuma tarefa com este filtro.
              </div>
            ) : (
              <div className="space-y-2.5">
                {tarefasFiltradas.map((tarefa) => (
                  <KanbanTaskCard
                    key={tarefa.id}
                    tarefa={tarefa}
                    onOpen={() => abrirEdicao(tarefa)}
                    onToggleDone={() => {
                      void handleAlterarStatus(
                        tarefa,
                        tarefa.status === 'CONCLUIDO' ? 'A_FAZER' : 'CONCLUIDO',
                      )
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        className="duocal-constrained-width pointer-events-none fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-1/2 z-20 flex w-full -translate-x-1/2 justify-end px-4"
      >
        <button
          type="button"
          onClick={abrirNovaTarefa}
          className="pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-black text-white shadow-[0_12px_30px_rgba(84,102,241,0.42)] transition active:scale-95"
          style={{ background: 'linear-gradient(135deg,#5466F1,#B66DFF)' }}
        >
          <Plus className="size-4" strokeWidth={2.6} />
          Nova tarefa
        </button>
      </div>

      <BottomNavigation activeTab="kanban" unreadCount={unreadCount} />

      {formAberto && workspaceId && (
        <KanbanTaskFormSheet
          workspaceId={workspaceId}
          membros={membros}
          categorias={categorias}
          tarefaParaEditar={tarefaEditando}
          isSaving={isSaving}
          onSave={handleSave}
          onDelete={tarefaEditando ? handleExcluir : undefined}
          onClose={fecharForm}
        />
      )}

      {perfilIncompleto && perfil ? <ProfileSetupModal perfil={perfil} /> : null}
      <VersionOutdatedModal open={versaoDesatualizada} />
    </>
  )
}
