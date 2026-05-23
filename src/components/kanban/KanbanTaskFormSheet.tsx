import { useState } from 'react'
import { Calendar, Flag, X } from 'lucide-react'
import type { CategoriaEvento, MembroWorkspace } from '../../hooks'
import type { AtualizarTarefaPayload, CriarTarefaPayload, PrioridadeTarefa, StatusTarefa, TarefaKanban } from '../../hooks'
import { cn } from '../../utils'
import { Button } from '../ui/Button'
import { FeedbackAlert } from '../ui/FeedbackAlert'
import { EventDatePickerSheet } from '../events/EventDatePickerSheet'
import { PRIORIDADE_CONFIG, STATUS_CONFIG } from './KanbanTaskCard'


type FormState = {
  titulo: string
  descricao: string
  status: StatusTarefa
  prioridade: PrioridadeTarefa
  categoriaId: string
  responsavelId: string
  dtPrazo: string
}

type KanbanTaskFormSheetProps = {
  workspaceId: string
  membros: MembroWorkspace[]
  categorias: CategoriaEvento[]
  tarefaParaEditar?: TarefaKanban | null
  isSaving: boolean
  onSave: (payload: CriarTarefaPayload | AtualizarTarefaPayload) => Promise<void>
  onDelete?: () => void
  onClose: () => void
}

function toDateISO(ts: string): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateDisplay(iso: string) {
  if (!iso) return 'Sem prazo'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function initFromTarefa(tarefa: TarefaKanban): FormState {
  return {
    titulo:       tarefa.titulo,
    descricao:    tarefa.descricao ?? '',
    status:       tarefa.status,
    prioridade:   tarefa.prioridade,
    categoriaId:  tarefa.categoria_id ?? '',
    responsavelId: tarefa.responsavel_id ?? '',
    dtPrazo:      tarefa.dt_prazo ? toDateISO(tarefa.dt_prazo) : '',
  }
}

function initDefault(): FormState {
  return {
    titulo:       '',
    descricao:    '',
    status:       'A_FAZER',
    prioridade:   'MEDIA',
    categoriaId:  '',
    responsavelId: '',
    dtPrazo:      '',
  }
}

export function KanbanTaskFormSheet({
  workspaceId,
  membros,
  categorias,
  tarefaParaEditar,
  isSaving,
  onSave,
  onDelete,
  onClose,
}: KanbanTaskFormSheetProps) {
  const modoEdicao = Boolean(tarefaParaEditar)

  const [form, setForm] = useState<FormState>(() =>
    tarefaParaEditar ? initFromTarefa(tarefaParaEditar) : initDefault(),
  )
  const [erro, setErro] = useState<string | null>(null)
  const [pickerAberto, setPickerAberto] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setErro(null)

    if (!form.titulo.trim()) {
      setErro('O título da tarefa é obrigatório.')
      return
    }

    const payload: CriarTarefaPayload = {
      workspaceId,
      titulo:       form.titulo.trim(),
      descricao:    form.descricao.trim() || undefined,
      status:       form.status,
      prioridade:   form.prioridade,
      categoriaId:  form.categoriaId || undefined,
      responsavelId: form.responsavelId || undefined,
      dtPrazo:      form.dtPrazo
        ? new Date(`${form.dtPrazo}T23:59:00`).toISOString()
        : undefined,
    }

    const payloadFinal = modoEdicao
      ? { ...payload, tarefaId: tarefaParaEditar!.id } as AtualizarTarefaPayload
      : payload

    try {
      await onSave(payloadFinal)
      onClose()
    } catch (error) {
      setErro(
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: string }).message)
          : 'Não foi possível salvar a tarefa.',
      )
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,20,74,0.36)] backdrop-blur-sm">
        <div
          className="duocal-constrained-width flex w-full flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_-16px_60px_rgba(17,20,74,0.14)]"
          style={{ maxHeight: 'min(92dvh, 680px)' }}
        >
          {/* Handle */}
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-[var(--duocal-border)]" />
          </div>

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--duocal-border)] px-5 pt-2 pb-4">
            <h2 className="text-xl font-black text-[var(--duocal-text)]">
              {modoEdicao ? 'Editar tarefa' : 'Nova tarefa'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)] transition hover:bg-[rgba(84,102,241,0.08)] hover:text-[var(--duocal-primary)]"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4">
            <div className="space-y-5">
              {erro && (
                <FeedbackAlert message={erro} onClose={() => setErro(null)} variant="error" />
              )}

              {/* Título */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--duocal-text)]">
                  Título <span className="text-[var(--duocal-danger)]">*</span>
                </label>
                <input
                  className="duocal-input"
                  placeholder="Ex: Planejar viagem"
                  value={form.titulo}
                  onChange={(e) => set('titulo', e.target.value)}
                  maxLength={150}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--duocal-text)]">
                  Descrição{' '}
                  <span className="text-xs font-normal text-[var(--duocal-muted)]">(opcional)</span>
                </label>
                <textarea
                  className="duocal-input h-auto min-h-[64px] resize-none py-3 text-sm leading-5"
                  placeholder="Detalhes da tarefa..."
                  value={form.descricao}
                  onChange={(e) => set('descricao', e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--duocal-text)]">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(STATUS_CONFIG) as StatusTarefa[]).map((s) => {
                    const cfg = STATUS_CONFIG[s]
                    const ativo = form.status === s
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set('status', s)}
                        className={cn(
                          'rounded-2xl px-3 py-2.5 text-xs font-bold transition',
                          ativo ? 'ring-2' : 'bg-[var(--duocal-surface-soft)]',
                        )}
                        style={ativo ? {
                          backgroundColor: cfg.bg,
                          color: cfg.cor,
                          ringColor: cfg.cor,
                        } : { color: 'var(--duocal-muted)' }}
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Prioridade */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--duocal-text)]">Prioridade</label>
                <div className="flex gap-2">
                  {(Object.keys(PRIORIDADE_CONFIG) as PrioridadeTarefa[]).map((p) => {
                    const cfg = PRIORIDADE_CONFIG[p]
                    const ativo = form.prioridade === p
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => set('prioridade', p)}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold transition',
                          ativo ? '' : 'bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)]',
                        )}
                        style={ativo ? { backgroundColor: cfg.cor + '18', color: cfg.cor } : {}}
                      >
                        <Flag className="size-3" />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Prazo */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--duocal-text)]">
                  Prazo{' '}
                  <span className="text-xs font-normal text-[var(--duocal-muted)]">(opcional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setPickerAberto(true)}
                  className="flex h-12 w-full cursor-pointer items-center justify-between rounded-[18px] border border-[var(--duocal-border)] bg-[var(--duocal-surface-soft)] px-4 text-sm text-[var(--duocal-text)] transition hover:border-[var(--duocal-primary)]"
                >
                  <span className={cn(!form.dtPrazo && 'text-[var(--duocal-muted)]')}>
                    {formatDateDisplay(form.dtPrazo)}
                  </span>
                  <Calendar className="size-[18px] shrink-0 text-[var(--duocal-muted)]" />
                </button>
                {form.dtPrazo && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-[var(--duocal-danger)] underline"
                    onClick={() => set('dtPrazo', '')}
                  >
                    Remover prazo
                  </button>
                )}
              </div>

              {/* Responsável */}
              {membros.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--duocal-text)]">
                    Responsável{' '}
                    <span className="text-xs font-normal text-[var(--duocal-muted)]">(opcional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => set('responsavelId', '')}
                      className={cn(
                        'rounded-2xl px-3.5 py-2 text-xs font-semibold transition',
                        !form.responsavelId
                          ? 'bg-(--duocal-primary) text-white'
                          : 'bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)]',
                      )}
                    >
                      Qualquer um
                    </button>
                    {membros.map((m) => (
                      <button
                        key={m.usuario_id}
                        type="button"
                        onClick={() => set('responsavelId', m.usuario_id)}
                        className={cn(
                          'rounded-2xl px-3.5 py-2 text-xs font-semibold transition',
                          form.responsavelId === m.usuario_id
                            ? 'bg-(--duocal-primary) text-white'
                            : 'bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)]',
                        )}
                      >
                        {m.nm_usuario.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categoria */}
              {categorias.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--duocal-text)]">
                    Categoria{' '}
                    <span className="text-xs font-normal text-[var(--duocal-muted)]">(opcional)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => set('categoriaId', '')}
                      className={cn(
                        'rounded-2xl px-3.5 py-2 text-xs font-semibold transition',
                        !form.categoriaId
                          ? 'bg-(--duocal-primary) text-white'
                          : 'bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)]',
                      )}
                    >
                      Sem categoria
                    </button>
                    {categorias.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => set('categoriaId', c.id)}
                        className={cn(
                          'rounded-2xl px-3.5 py-2 text-xs font-semibold transition',
                          form.categoriaId === c.id ? 'ring-2' : 'bg-[var(--duocal-surface-soft)]',
                        )}
                        style={
                          form.categoriaId === c.id
                            ? { backgroundColor: c.cd_cor + '22', color: c.cd_cor, ringColor: c.cd_cor }
                            : { color: 'var(--duocal-muted)' }
                        }
                      >
                        {c.nm_categoria}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Excluir — apenas em edição */}
              {modoEdicao && onDelete && (
                <div className="pt-1">
                  {confirmandoExclusao ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                      <p className="mb-3 text-sm font-medium text-red-700">
                        Tem certeza que quer excluir esta tarefa?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmandoExclusao(false)}
                          className="flex-1 rounded-xl bg-[var(--duocal-surface-soft)] py-2 text-xs font-semibold text-[var(--duocal-muted)]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={onDelete}
                          className="flex-1 rounded-xl bg-red-500 py-2 text-xs font-semibold text-white"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmandoExclusao(true)}
                      className="w-full rounded-2xl border border-red-200 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                    >
                      Excluir tarefa
                    </button>
                  )}
                </div>
              )}

              <div className="h-2" />
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[var(--duocal-border)] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <Button className="w-full" isLoading={isSaving} onClick={handleSave}>
              {modoEdicao ? 'Salvar alterações' : 'Criar tarefa'}
            </Button>
          </div>
        </div>
      </div>

      {pickerAberto && (
        <EventDatePickerSheet
          value={form.dtPrazo || (() => {
            const d = new Date()
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          })()}
          onConfirm={(d) => { set('dtPrazo', d); setPickerAberto(false) }}
          onClose={() => setPickerAberto(false)}
        />
      )}
    </>
  )
}
