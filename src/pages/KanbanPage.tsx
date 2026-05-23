import { useEffect, useState } from 'react'
import { Columns3, Plus } from 'lucide-react'
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
  useOnlineStatus,
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
import { KanbanTaskCard, STATUS_CONFIG } from '../components/kanban/KanbanTaskCard'
import { KanbanTaskFormSheet } from '../components/kanban/KanbanTaskFormSheet'

type FiltroStatus = StatusTarefa | 'TODOS'

const FILTROS: { label: string; value: FiltroStatus }[] = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'A fazer', value: 'A_FAZER' },
  { label: 'Em andamento', value: 'EM_ANDAMENTO' },
  { label: 'Planejado', value: 'PLANEJADO' },
  { label: 'Concluído', value: 'CONCLUIDO' },
]

function filtrarTarefas(tarefas: TarefaKanban[], filtro: FiltroStatus): TarefaKanban[] {
  if (filtro === 'TODOS') return tarefas
  return tarefas.filter((t) => t.status === filtro)
}

function StatusSummaryCards({
  tarefas,
  filtroAtivo,
  onFiltrar,
}: {
  tarefas: TarefaKanban[]
  filtroAtivo: FiltroStatus
  onFiltrar: (status: FiltroStatus) => void
}) {
  const statusOrdem: StatusTarefa[] = ['EM_ANDAMENTO', 'A_FAZER', 'PLANEJADO', 'CONCLUIDO']

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {statusOrdem.map((s) => {
        const cfg = STATUS_CONFIG[s]
        const count = tarefas.filter((t) => t.status === s).length
        const ativo = filtroAtivo === s

        return (
          <button
            key={s}
            type="button"
            onClick={() => onFiltrar(ativo ? 'TODOS' : s)}
            className="flex flex-col rounded-2xl border p-3.5 text-left transition active:scale-[0.97]"
            style={{
              backgroundColor: ativo ? cfg.bg : 'white',
              borderColor: ativo ? cfg.cor + '55' : 'var(--duocal-border)',
            }}
          >
            <span
              className="mb-1.5 text-2xl font-black"
              style={{ color: cfg.cor }}
            >
              {count}
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: ativo ? cfg.cor : 'var(--duocal-muted)' }}
            >
              {cfg.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}


function FiltroChips({
  filtroAtivo,
  onFiltrar,
}: {
  filtroAtivo: FiltroStatus
  onFiltrar: (f: FiltroStatus) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
      {FILTROS.map((f) => {
        const ativo = filtroAtivo === f.value
        const cfg = f.value !== 'TODOS' ? STATUS_CONFIG[f.value as StatusTarefa] : null

        return (
          <button
            key={f.value}
            type="button"
            onClick={() => onFiltrar(f.value)}
            className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition"
            style={
              ativo
                ? {
                    backgroundColor: cfg ? cfg.cor : 'var(--duocal-primary)',
                    color: 'white',
                  }
                : {
                    backgroundColor: 'var(--duocal-surface-soft)',
                    color: 'var(--duocal-muted)',
                  }
            }
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

function LoadingKanban() {
  return (
    <div className="space-y-3 px-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl bg-[var(--duocal-surface-soft)]"
        />
      ))}
    </div>
  )
}


function EmptyKanban({ onNova }: { onNova: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
      <div className="grid size-16 place-items-center rounded-3xl bg-[var(--duocal-surface-soft)]">
        <Columns3 className="size-8 text-[var(--duocal-primary)] opacity-60" />
      </div>
      <div>
        <p className="font-bold text-[var(--duocal-text)]">Nenhuma tarefa ainda</p>
        <p className="mt-1 text-sm text-[var(--duocal-muted)]">
          Crie uma tarefa para organizar o que vocês têm a fazer.
        </p>
      </div>
      <button
        type="button"
        onClick={onNova}
        className="rounded-2xl bg-(--duocal-primary) px-6 py-2.5 text-sm font-bold text-white"
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
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (!isSessionLoading && !session) window.location.replace('/login')
  }, [isSessionLoading, session])

  const { data: tarefas = [], isLoading, isError } = useTarefasKanban(workspaceId)
  const { data: membros = [] } = useMembrosWorkspace(workspaceId)
  const { data: categorias = [] } = useCategoriasEvento(workspaceId)

  const criarTarefa = useCriarTarefa()
  const atualizarTarefa = useAtualizarTarefa()
  const alterarStatus = useAlterarStatusTarefa()
  const excluirTarefa = useExcluirTarefa()

  const [filtroAtivo, setFiltroAtivo] = useState<FiltroStatus>('TODOS')
  const [formAberto, setFormAberto] = useState(false)
  const [tarefaEditando, setTarefaEditando] = useState<TarefaKanban | null>(null)
  const [versaoDesatualizada, setVersaoDesatualizada] = useState(false)

  const perfilIncompleto = Boolean(perfil && (!perfil.fl_perfil_completo || !perfil.nm_usuario))
  const tarefasFiltradas = filtrarTarefas(tarefas, filtroAtivo)

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
    if (!workspaceId) return
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
        className="duocal-app-shell fixed inset-x-0 top-0 flex flex-col overflow-hidden"
        style={{
          height: '100dvh',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--duocal-muted)]">
                {workspace?.workspace.nm_workspace ?? 'DuoCal'}
              </p>
              <h1 className="text-2xl font-black text-[var(--duocal-text)]">Kanban</h1>
            </div>
          </div>
        </div>

        {/* Offline bar */}
        {!isOnline && (
          <div className="shrink-0 px-4 pb-1">
            <OfflineBar />
          </div>
        )}

        {/* Conteúdo com scroll */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(76px+env(safe-area-inset-bottom))] scrollbar-hide">
          <div className="px-4 py-2 space-y-4">

            {/* Resumo por status */}
            {!isLoading && tarefas.length > 0 && (
              <StatusSummaryCards
                tarefas={tarefas}
                filtroAtivo={filtroAtivo}
                onFiltrar={(s) => setFiltroAtivo(s === filtroAtivo ? 'TODOS' : s)}
              />
            )}

            {/* Chips de filtro */}
            {!isLoading && tarefas.length > 0 && (
              <FiltroChips filtroAtivo={filtroAtivo} onFiltrar={setFiltroAtivo} />
            )}

            {/* Lista de tarefas */}
            {isLoading ? (
              <LoadingKanban />
            ) : isError ? (
              <div className="rounded-2xl bg-red-50 p-4 text-center text-sm text-red-600">
                Erro ao carregar tarefas. Tente novamente.
              </div>
            ) : tarefas.length === 0 ? (
              <EmptyKanban onNova={() => setFormAberto(true)} />
            ) : tarefasFiltradas.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--duocal-muted)]">
                Nenhuma tarefa com este filtro.
              </div>
            ) : (
              <div className="space-y-2.5">
                {tarefasFiltradas.map((tarefa) => (
                  <KanbanTaskCardComStatus
                    key={tarefa.id}
                    tarefa={tarefa}
                    onEdit={() => abrirEdicao(tarefa)}
                    onAlterarStatus={(s) => handleAlterarStatus(tarefa, s)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => { setTarefaEditando(null); setFormAberto(true) }}
        aria-label="Nova tarefa"
        className="duocal-constrained-width fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-1/2 z-20 -translate-x-1/2"
        style={{ pointerEvents: 'none' }}
      >
        <span
          className="pointer-events-auto absolute right-4 bottom-4 flex size-14 items-center justify-center rounded-full shadow-[0_8px_30px_rgba(84,102,241,0.38)] transition active:scale-95"
          style={{ background: 'linear-gradient(135deg,#5466F1,#B66DFF)' }}
        >
          <Plus className="size-6 text-white" strokeWidth={2.5} />
        </span>
      </button>

      {/* Bottom nav */}
      <BottomNavigation activeTab="kanban" unreadCount={unreadCount} />

      {/* Form sheet */}
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

      {/* Modais de sistema */}
      {perfilIncompleto && perfil && <ProfileSetupModal perfil={perfil} />}
      {versaoDesatualizada && <VersionOutdatedModal />}
    </>
  )
}

// ─── Card com botões de mudança de status rápida ──────────────────────────────

function KanbanTaskCardComStatus({
  tarefa,
  onEdit,
  onAlterarStatus,
}: {
  tarefa: TarefaKanban
  onEdit: () => void
  onAlterarStatus: (status: StatusTarefa) => void
}) {
  const [expandido, setExpandido] = useState(false)
  const statusOrdem: StatusTarefa[] = ['A_FAZER', 'EM_ANDAMENTO', 'PLANEJADO', 'CONCLUIDO']

  return (
    <div>
      <KanbanTaskCard tarefa={tarefa} onClick={onEdit} />

      {/* Ação rápida de status ao pressionar longamente — simplificado como toggle */}
      <div className="mt-1 flex gap-1.5 px-1">
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="text-[10px] font-semibold text-[var(--duocal-muted)] underline"
        >
          {expandido ? 'Ocultar status' : 'Mudar status'}
        </button>
      </div>

      {expandido && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 px-1">
          {statusOrdem.map((s) => {
            const cfg = STATUS_CONFIG[s]
            const ativo = tarefa.status === s
            return (
              <button
                key={s}
                type="button"
                disabled={ativo}
                onClick={() => { onAlterarStatus(s); setExpandido(false) }}
                className="rounded-full px-3 py-1 text-[10px] font-bold transition disabled:opacity-50"
                style={{
                  backgroundColor: ativo ? cfg.cor : cfg.bg,
                  color: ativo ? 'white' : cfg.cor,
                }}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
