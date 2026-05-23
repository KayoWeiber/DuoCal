import { useState } from 'react'
import { ArrowLeft, Pencil, Plus, Trash2, X } from 'lucide-react'
import type { CategoriaEvento } from '../../hooks'
import {
  useAtualizarCategoria,
  useCriarCategoria,
  useDesativarCategoria,
} from '../../hooks/useGerenciarCategorias'
import { useCategoriasEvento } from '../../hooks'
import { Button } from '../ui/Button'
import { FeedbackAlert } from '../ui/FeedbackAlert'

const PALETTE = [
  '#2563EB', '#3B82F6', '#06B6D4', '#0D9488',
  '#16A34A', '#65A30D', '#CA8A04', '#EA580C',
  '#EF4444', '#DB2777', '#A855F7', '#7C3AED',
]

type Modo = 'lista' | 'nova' | CategoriaEvento

type Props = {
  workspaceId: string
  onClose: () => void
}

export function CategoryManagementSheet({ workspaceId, onClose }: Props) {
  const categoriasQuery = useCategoriasEvento(workspaceId)
  const categorias = categoriasQuery.data ?? []

  const criarCategoria    = useCriarCategoria()
  const atualizarCategoria = useAtualizarCategoria()
  const desativarCategoria = useDesativarCategoria()

  const [modo, setModo] = useState<Modo>('lista')
  const [nome, setNome] = useState('')
  const [cor, setCor] = useState(PALETTE[0])
  const [erro, setErro] = useState<string | null>(null)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)

  function abrirNova() {
    setNome('')
    setCor(PALETTE[0])
    setErro(null)
    setModo('nova')
  }

  function abrirEdicao(cat: CategoriaEvento) {
    setNome(cat.nm_categoria)
    setCor(cat.cd_cor)
    setErro(null)
    setConfirmandoId(null)
    setModo(cat)
  }

  function voltarLista() {
    setErro(null)
    setConfirmandoId(null)
    setModo('lista')
    categoriasQuery.refetch()
  }

  async function salvar() {
    setErro(null)

    if (!nome.trim()) {
      setErro('Informe o nome da categoria.')
      return
    }

    try {
      if (modo === 'nova') {
        await criarCategoria.mutateAsync({
          workspaceId,
          nmCategoria: nome.trim(),
          cdCor: cor,
        })
      } else if (typeof modo === 'object') {
        await atualizarCategoria.mutateAsync({
          categoriaId: modo.id,
          workspaceId,
          nmCategoria: nome.trim(),
          cdCor: cor,
        })
      }
      voltarLista()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('uq_dim_categoria_evento_workspace_nome') || msg.includes('já existe')) {
        setErro('Já existe uma categoria com esse nome neste workspace.')
      } else {
        setErro('Não foi possível salvar a categoria. Tente novamente.')
      }
    }
  }

  async function desativar(cat: CategoriaEvento) {
    try {
      await desativarCategoria.mutateAsync({
        categoriaId: cat.id,
        workspaceId,
      })
      voltarLista()
    } catch {
      setErro('Não foi possível remover a categoria. Tente novamente.')
    }
  }

  const isSaving =
    criarCategoria.isPending || atualizarCategoria.isPending

  const isListMode = modo === 'lista'
  const isFormMode = modo !== 'lista'
  const editando = typeof modo === 'object' ? modo : null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,20,74,0.36)] backdrop-blur-sm">
      <div
        className="duocal-constrained-width flex w-full flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_-16px_60px_rgba(17,20,74,0.14)]"
        style={{ maxHeight: 'min(88dvh, 680px)' }}
      >
        {/* Handle */}
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-[var(--duocal-border)]" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--duocal-border)] px-5 pt-2 pb-4">
          {isFormMode ? (
            <button
              type="button"
              onClick={voltarLista}
              className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)] transition hover:bg-[rgba(84,102,241,0.08)] hover:text-[var(--duocal-primary)]"
              aria-label="Voltar"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : (
            <div className="size-9" />
          )}

          <h2 className="text-xl font-black text-[var(--duocal-text)]">
            {isListMode ? 'Categorias' : editando ? 'Editar categoria' : 'Nova categoria'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)] transition hover:bg-[rgba(84,102,241,0.08)] hover:text-[var(--duocal-primary)]"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4">

          {/* ── Lista ── */}
          {isListMode && (
            <div className="space-y-2">
              {categoriasQuery.isLoading ? (
                <p className="py-6 text-center text-sm text-[var(--duocal-muted)]">
                  Carregando...
                </p>
              ) : categorias.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--duocal-muted)]">
                  Nenhuma categoria ainda.
                </p>
              ) : (
                categorias.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 rounded-[18px] border border-[var(--duocal-border)] bg-[var(--duocal-surface-soft)] px-4 py-3"
                  >
                    <span
                      className="size-4 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.cd_cor }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--duocal-text)]">
                      {cat.nm_categoria}
                    </span>
                    <button
                      type="button"
                      onClick={() => abrirEdicao(cat)}
                      className="grid size-8 shrink-0 place-items-center rounded-xl text-[var(--duocal-muted)] transition hover:bg-[rgba(84,102,241,0.08)] hover:text-[var(--duocal-primary)]"
                      aria-label={`Editar ${cat.nm_categoria}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  </div>
                ))
              )}

              {/* Nova categoria */}
              <button
                type="button"
                onClick={abrirNova}
                className="mt-2 flex w-full items-center gap-2 rounded-[18px] border border-dashed border-[var(--duocal-border)] px-4 py-3 text-sm font-semibold text-[var(--duocal-primary)] transition hover:bg-[rgba(84,102,241,0.06)]"
              >
                <Plus className="size-4" />
                Nova categoria
              </button>
            </div>
          )}

          {/* ── Formulário ── */}
          {isFormMode && (
            <div className="space-y-5">
              {erro && (
                <FeedbackAlert
                  message={erro}
                  onClose={() => setErro(null)}
                  variant="error"
                />
              )}

              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--duocal-text)]">
                  Nome <span className="text-[var(--duocal-danger)]">*</span>
                </label>
                <input
                  className="duocal-input"
                  placeholder="Ex: Academia, Viagem..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={60}
                  autoFocus
                />
              </div>

              {/* Cor */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[var(--duocal-text)]">
                  Cor
                </label>
                <div className="grid grid-cols-6 gap-2.5">
                  {PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCor(c)}
                      className="aspect-square w-full rounded-2xl transition-transform hover:scale-110 active:scale-95"
                      style={{
                        backgroundColor: c,
                        outline: cor === c ? `3px solid ${c}` : 'none',
                        outlineOffset: '2px',
                        opacity: cor === c ? 1 : 0.72,
                      }}
                      aria-label={`Selecionar cor ${c}`}
                    />
                  ))}
                </div>

                {/* Preview */}
                <div className="flex items-center gap-2 pt-1 min-w-0 overflow-hidden">
                  <span
                    className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                    style={{ backgroundColor: cor + '22', color: cor }}
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                    <span className="truncate">{nome.trim() || 'Prévia'}</span>
                  </span>
                </div>
              </div>

              {/* Desativar (só para categorias existentes) */}
              {editando && (
                <div className="pt-2">
                  {confirmandoId === editando.id ? (
                    <div className="rounded-2xl border border-[rgba(255,90,122,0.20)] bg-[rgba(255,90,122,0.04)] p-4 space-y-3">
                      <p className="text-sm font-semibold text-[var(--duocal-danger)]">
                        Remover &ldquo;{editando.nm_categoria}&rdquo;?
                      </p>
                      <p className="text-xs text-[var(--duocal-muted)]">
                        Eventos com esta categoria não serão afetados, mas a categoria não estará mais disponível para novos eventos.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmandoId(null)}
                          className="flex-1 rounded-2xl border border-[var(--duocal-border)] py-2 text-sm font-semibold text-[var(--duocal-muted)] transition hover:bg-[var(--duocal-surface-soft)]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => desativar(editando)}
                          disabled={desativarCategoria.isPending}
                          className="flex-1 rounded-2xl bg-[var(--duocal-danger)] py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                        >
                          {desativarCategoria.isPending ? 'Removendo...' : 'Remover'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmandoId(editando.id)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[rgba(255,90,122,0.20)] py-2.5 text-sm font-semibold text-[var(--duocal-danger)] transition hover:bg-[rgba(255,90,122,0.04)]"
                    >
                      <Trash2 className="size-4" />
                      Remover categoria
                    </button>
                  )}
                </div>
              )}

              <div className="h-2" />
            </div>
          )}
        </div>

        {/* Footer (apenas no formulário) */}
        {isFormMode && (
          <div className="shrink-0 border-t border-[var(--duocal-border)] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <Button className="w-full" isLoading={isSaving} onClick={salvar}>
              Salvar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
