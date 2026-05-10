import { useState } from 'react'
import { X, Calendar, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CategoriaEvento, CriarEventoPayload, MembroWorkspace } from '../../hooks'
import { cn } from '../../utils'
import { Button } from '../ui/Button'
import { FeedbackAlert } from '../ui/FeedbackAlert'
import { CategoryPicker } from './CategoryPicker'
import { MemberPicker } from './MemberPicker'
import { EventDatePickerSheet } from './EventDatePickerSheet'
import { EventTimePickerSheet } from './EventTimePickerSheet'

type EventFormSheetProps = {
  workspaceId: string
  membros: MembroWorkspace[]
  categorias: CategoriaEvento[]
  usuarioAtualId: string
  isSaving: boolean
  onSave: (payload: CriarEventoPayload) => Promise<void>
  onClose: () => void
}

type FormState = {
  titulo: string
  descricao: string
  data: string
  horaInicio: string
  horaFim: string
  categoriaId: string
  participantes: string[]
  flDiaTodo: boolean
  flBloqueiaHorario: boolean
  flRecorrente: boolean
  tpFrequencia: 'DIARIA' | 'SEMANAL' | 'MENSAL' | ''
}

function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function horaFormatada(offsetMinutos = 0) {
  const d = new Date(Date.now() + offsetMinutos * 60_000)
  d.setMinutes(Math.ceil(d.getMinutes() / 30) * 30, 0, 0)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function buildTimestamp(data: string, hora: string) {
  return new Date(`${data}T${hora}:00`).toISOString()
}

function formatDateDisplay(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function EventFormSheet({
  workspaceId,
  membros,
  categorias,
  usuarioAtualId,
  isSaving,
  onSave,
  onClose,
}: EventFormSheetProps) {
  const [form, setForm] = useState<FormState>({
    titulo: '',
    descricao: '',
    data: hojeISO(),
    horaInicio: horaFormatada(),
    horaFim: horaFormatada(60),
    categoriaId: '',
    participantes: [usuarioAtualId],
    flDiaTodo: false,
    flBloqueiaHorario: true,
    flRecorrente: false,
    tpFrequencia: '',
  })
  const [erro, setErro] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState<'date' | 'startTime' | 'endTime' | null>(null)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setErro(null)

    if (!form.titulo.trim()) {
      setErro('O título do evento é obrigatório.')
      return
    }

    if (!form.data) {
      setErro('A data do evento é obrigatória.')
      return
    }

    if (!form.flDiaTodo && (!form.horaInicio || !form.horaFim)) {
      setErro('Os horários de início e fim são obrigatórios.')
      return
    }

    if (form.participantes.length === 0) {
      setErro('Selecione pelo menos um participante.')
      return
    }

    const dtInicio = form.flDiaTodo
      ? buildTimestamp(form.data, '00:00')
      : buildTimestamp(form.data, form.horaInicio)

    const dtFim = form.flDiaTodo
      ? buildTimestamp(form.data, '23:59')
      : buildTimestamp(form.data, form.horaFim)

    if (!form.flDiaTodo && new Date(dtFim) <= new Date(dtInicio)) {
      setErro('O horário de fim deve ser posterior ao de início.')
      return
    }

    const payload: CriarEventoPayload = {
      workspaceId,
      nmEvento: form.titulo.trim(),
      dtInicio,
      dtFim,
      participantes: form.participantes,
      dsEvento: form.descricao.trim() || undefined,
      categoriaId: form.categoriaId || undefined,
      flDiaTodo: form.flDiaTodo,
      flBloqueiaHorario: form.flBloqueiaHorario,
      flRecorrente: form.flRecorrente,
      tpFrequencia:
        form.flRecorrente && form.tpFrequencia ? form.tpFrequencia : undefined,
    }

    try {
      await onSave(payload)
      onClose()
    } catch (error) {
      setErro(
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: string }).message)
          : 'Não foi possível salvar o evento.',
      )
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,20,74,0.36)] backdrop-blur-sm">
        <div className="duocal-constrained-width flex w-full flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_-16px_60px_rgba(17,20,74,0.14)]" style={{ maxHeight: 'min(92dvh, 720px)' }}>

          {/* Handle */}
          <div className="flex shrink-0 justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-[var(--duocal-border)]" />
          </div>

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--duocal-border)] px-5 pt-2 pb-4">
            <h2 className="text-xl font-black text-[var(--duocal-text)]">Novo evento</h2>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-2xl bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)] transition hover:bg-[rgba(84,102,241,0.08)] hover:text-[var(--duocal-primary)]"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Body — scrolls, never overflows horizontally */}
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4">
            <div className="space-y-5">
              {erro ? (
                <FeedbackAlert
                  message={erro}
                  onClose={() => setErro(null)}
                  variant="error"
                />
              ) : null}

              {/* Título */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--duocal-text)]">
                  Título <span className="text-[var(--duocal-danger)]">*</span>
                </label>
                <input
                  className="duocal-input"
                  placeholder="Ex: Consulta médica"
                  value={form.titulo}
                  onChange={(e) => set('titulo', e.target.value)}
                  maxLength={120}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--duocal-text)]">
                  Descrição{' '}
                  <span className="text-xs font-normal text-[var(--duocal-muted)]">(opcional)</span>
                </label>
                <textarea
                  className="duocal-input h-auto min-h-[72px] resize-none py-3 text-sm leading-5"
                  placeholder="Detalhes do evento..."
                  value={form.descricao}
                  onChange={(e) => set('descricao', e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>

              {/* Data e horários */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--duocal-text)]">
                    Data <span className="text-[var(--duocal-danger)]">*</span>
                  </label>
                  <PickerButton
                    icon={Calendar}
                    value={formatDateDisplay(form.data)}
                    onClick={() => setPickerOpen('date')}
                  />
                </div>

                {!form.flDiaTodo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[var(--duocal-text)]">
                        Início <span className="text-[var(--duocal-danger)]">*</span>
                      </label>
                      <PickerButton
                        icon={Clock}
                        value={form.horaInicio}
                        onClick={() => setPickerOpen('startTime')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[var(--duocal-text)]">
                        Fim <span className="text-[var(--duocal-danger)]">*</span>
                      </label>
                      <PickerButton
                        icon={Clock}
                        value={form.horaFim}
                        onClick={() => setPickerOpen('endTime')}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="w-full overflow-hidden rounded-2xl border border-[var(--duocal-border)] divide-y divide-[var(--duocal-border)]">
                <ToggleRow
                  label="Dia todo"
                  checked={form.flDiaTodo}
                  onChange={(v) => set('flDiaTodo', v)}
                />
                <ToggleRow
                  label="Bloquear horário"
                  checked={form.flBloqueiaHorario}
                  onChange={(v) => set('flBloqueiaHorario', v)}
                />
                <ToggleRow
                  label="Evento recorrente"
                  checked={form.flRecorrente}
                  onChange={(v) => set('flRecorrente', v)}
                />
              </div>

              {/* Recorrência */}
              {form.flRecorrente && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[var(--duocal-text)]">
                    Frequência
                  </label>
                  <div className="flex gap-2">
                    {(['DIARIA', 'SEMANAL', 'MENSAL'] as const).map((tp) => (
                      <button
                        key={tp}
                        type="button"
                        onClick={() => set('tpFrequencia', form.tpFrequencia === tp ? '' : tp)}
                        className={cn(
                          'flex-1 rounded-2xl py-2.5 text-sm font-semibold transition',
                          form.tpFrequencia === tp
                            ? 'bg-[var(--duocal-primary)] text-white'
                            : 'bg-[var(--duocal-surface-soft)] text-[var(--duocal-muted)]',
                        )}
                      >
                        {tp === 'DIARIA' ? 'Diária' : tp === 'SEMANAL' ? 'Semanal' : 'Mensal'}
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
                  <CategoryPicker
                    categorias={categorias}
                    value={form.categoriaId}
                    onChange={(id) => set('categoriaId', id)}
                  />
                </div>
              )}

              {/* Participantes */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[var(--duocal-text)]">
                  Participantes <span className="text-[var(--duocal-danger)]">*</span>
                </label>
                <MemberPicker
                  membros={membros}
                  value={form.participantes}
                  onChange={(ids) => set('participantes', ids)}
                />
              </div>

              <div className="h-2" />
            </div>
          </div>

          {/* Footer — always visible at bottom */}
          <div className="shrink-0 border-t border-[var(--duocal-border)] px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <Button className="w-full" isLoading={isSaving} onClick={handleSave}>
              Salvar evento
            </Button>
          </div>
        </div>
      </div>

      {pickerOpen === 'date' && (
        <EventDatePickerSheet
          value={form.data}
          onConfirm={(d) => { set('data', d); setPickerOpen(null) }}
          onClose={() => setPickerOpen(null)}
        />
      )}

      {pickerOpen === 'startTime' && (
        <EventTimePickerSheet
          title="Selecionar horário de início"
          value={form.horaInicio}
          onConfirm={(t) => { set('horaInicio', t); setPickerOpen(null) }}
          onClose={() => setPickerOpen(null)}
        />
      )}

      {pickerOpen === 'endTime' && (
        <EventTimePickerSheet
          title="Selecionar horário de fim"
          value={form.horaFim}
          onConfirm={(t) => { set('horaFim', t); setPickerOpen(null) }}
          onClose={() => setPickerOpen(null)}
        />
      )}
    </>
  )
}

function PickerButton({
  icon: Icon,
  value,
  onClick,
}: {
  icon: LucideIcon
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-full cursor-pointer items-center justify-between rounded-[18px] border border-[var(--duocal-border)] bg-[var(--duocal-surface-soft)] px-4 text-sm text-[var(--duocal-text)] transition hover:border-[var(--duocal-primary)] hover:bg-[var(--duocal-surface)]"
    >
      <span>{value}</span>
      <Icon className="size-[18px] shrink-0 text-[var(--duocal-muted)]" />
    </button>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex w-full items-center justify-between px-4 py-3">
      <span className="min-w-0 flex-1 text-sm font-medium text-[var(--duocal-text)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative ml-3 h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-[var(--duocal-primary)]' : 'bg-[var(--duocal-border)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}
