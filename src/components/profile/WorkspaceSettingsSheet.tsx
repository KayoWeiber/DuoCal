import { useState } from 'react'
import { Clock3, Copy, Share2, UsersRound, X } from 'lucide-react'
import {
  useAtualizarConfiguracaoWorkspace,
  useConfiguracaoWorkspace,
  type ConfiguracaoWorkspace,
  type MembroWorkspace,
} from '../../hooks'
import { getErrorMessage } from '../../lib'
import { Button } from '../ui/Button'
import { FeedbackAlert } from '../ui/FeedbackAlert'

type Props = {
  workspaceId: string
  papelAtual: string
  membros: MembroWorkspace[]
  codigoConvite?: string
  onClose: () => void
}

type HorarioMode = 'UTIL' | '24H' | 'CUSTOM'

export function WorkspaceSettingsSheet({
  workspaceId,
  papelAtual,
  membros,
  codigoConvite,
  onClose,
}: Props) {
  const configuracaoQuery = useConfiguracaoWorkspace(workspaceId)
  const configuracao = configuracaoQuery.data
  const canEdit = papelAtual === 'ADMIN'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,20,74,0.36)] backdrop-blur-sm">
      <div
        className="duocal-constrained-width flex w-full flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_-16px_60px_rgba(17,20,74,0.14)]"
        style={{ maxHeight: 'min(90dvh, 720px)' }}
      >
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-(--duocal-border)" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-(--duocal-border) px-5 pt-2 pb-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-(--duocal-text)">
              Workspace
            </h2>
            <p className="text-xs font-semibold text-(--duocal-muted)">
              {canEdit ? 'Configurações compartilhadas' : 'Somente visualização'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-2xl bg-(--duocal-surface-soft) text-(--duocal-muted) transition hover:bg-[rgba(84,102,241,0.08)] hover:text-(--duocal-primary)"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {configuracaoQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center px-5 text-sm font-semibold text-(--duocal-muted)">
            Carregando configurações...
          </div>
        ) : configuracaoQuery.isError || !configuracao ? (
          <div className="px-5 py-5">
            <FeedbackAlert
              message="Não foi possível carregar as configurações do workspace."
              variant="error"
            />
          </div>
        ) : (
          <WorkspaceSettingsForm
            canEdit={canEdit}
            codigoConvite={codigoConvite}
            membros={membros}
            onClose={onClose}
            configuracao={configuracao}
          />
        )}
      </div>
    </div>
  )
}

function WorkspaceSettingsForm({
  canEdit,
  codigoConvite,
  membros,
  onClose,
  configuracao,
}: {
  canEdit: boolean
  codigoConvite?: string
  membros: MembroWorkspace[]
  onClose: () => void
  configuracao: ConfiguracaoWorkspace
}) {
  const atualizarConfiguracao = useAtualizarConfiguracaoWorkspace()
  const [nome, setNome] = useState(configuracao.nmWorkspace)
  const [slogan, setSlogan] = useState(configuracao.dsSlogan)
  const [hrInicioDia, setHrInicioDia] = useState(configuracao.hrInicioDia)
  const [hrFimDia, setHrFimDia] = useState(configuracao.hrFimDia)
  const [notificacaoInterna, setNotificacaoInterna] = useState(
    configuracao.flNotificacaoInterna,
  )
  const [kanbanHabilitado, setKanbanHabilitado] = useState(
    configuracao.flKanbanHabilitado,
  )
  const [agendaHabilitada, setAgendaHabilitada] = useState(
    configuracao.flAgendaHabilitada,
  )
  const [timezone, setTimezone] = useState(configuracao.nmTimezone)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const horarioMode = getHorarioMode(hrInicioDia, hrFimDia)

  function setHorarioMode(mode: HorarioMode) {
    if (mode === '24H') {
      setHrInicioDia('00:00')
      setHrFimDia('23:00')
      return
    }

    if (mode === 'UTIL') {
      setHrInicioDia('06:00')
      setHrFimDia('23:00')
      return
    }

    if (hrInicioDia === '00:00' && hrFimDia === '23:00') {
      setHrInicioDia('06:00')
    }
  }

  async function handleCopyInvite() {
    if (!codigoConvite) return

    try {
      await navigator.clipboard.writeText(codigoConvite)
      setFeedback('Código copiado.')
      setErro(null)
    } catch {
      setErro('Não foi possível copiar o código.')
      setFeedback(null)
    }
  }

  async function handleShareInvite() {
    if (!codigoConvite) return

    const shareUrl = `${window.location.origin}/conectar?codigo=${codigoConvite}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DuoCal',
          text: 'Entre no meu workspace compartilhado no DuoCal usando este código.',
          url: shareUrl,
        })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setFeedback('Link copiado.')
      setErro(null)
    } catch {
      setErro(shareUrl)
      setFeedback(null)
    }
  }

  async function handleSave() {
    setFeedback(null)
    setErro(null)

    try {
      await atualizarConfiguracao.mutateAsync({
        workspaceId: configuracao.workspaceId,
        nmWorkspace: nome,
        dsSlogan: slogan,
        hrInicioDia,
        hrFimDia,
        flNotificacaoInterna: notificacaoInterna,
        flKanbanHabilitado: kanbanHabilitado,
        flAgendaHabilitada: agendaHabilitada,
        nmTimezone: timezone.trim() || 'America/Sao_Paulo',
      })
      setFeedback('Configurações salvas.')
    } catch (error) {
      setErro(getErrorMessage(error))
    }
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4">
        <div className="space-y-5">
          {feedback ? (
            <FeedbackAlert
              message={feedback}
              onClose={() => setFeedback(null)}
              variant="success"
            />
          ) : null}

          {erro ? (
            <FeedbackAlert
              message={erro}
              onClose={() => setErro(null)}
              variant="error"
            />
          ) : null}

          <section className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-(--duocal-text)">
                Nome do workspace
              </label>
              <input
                className="duocal-input"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                maxLength={80}
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-(--duocal-text)">
                Slogan
              </label>
              <textarea
                className="duocal-input h-auto min-h-[72px] resize-none py-3 text-sm leading-5"
                value={slogan}
                onChange={(event) => setSlogan(event.target.value)}
                maxLength={160}
                disabled={!canEdit}
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-(--duocal-primary)" />
              <h3 className="text-sm font-black text-(--duocal-text)">Agenda</h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <HorarioButton
                active={horarioMode === 'UTIL'}
                disabled={!canEdit}
                label="Útil"
                onClick={() => setHorarioMode('UTIL')}
              />
              <HorarioButton
                active={horarioMode === '24H'}
                disabled={!canEdit}
                label="24h"
                onClick={() => setHorarioMode('24H')}
              />
              <HorarioButton
                active={horarioMode === 'CUSTOM'}
                disabled={!canEdit}
                label="Manual"
                onClick={() => setHorarioMode('CUSTOM')}
              />
            </div>

            {horarioMode === 'CUSTOM' ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-(--duocal-muted)">Início</span>
                  <input
                    type="time"
                    className="duocal-input"
                    value={hrInicioDia}
                    onChange={(event) => setHrInicioDia(event.target.value)}
                    disabled={!canEdit}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold text-(--duocal-muted)">Fim</span>
                  <input
                    type="time"
                    className="duocal-input"
                    value={hrFimDia}
                    onChange={(event) => setHrFimDia(event.target.value)}
                    disabled={!canEdit}
                  />
                </label>
              </div>
            ) : null}

            <div className="space-y-2">
              <PreferenceToggle
                checked={agendaHabilitada}
                disabled={!canEdit}
                label="Agenda habilitada"
                onChange={setAgendaHabilitada}
              />
              <PreferenceToggle
                checked={kanbanHabilitado}
                disabled={!canEdit}
                label="Kanban habilitado"
                onChange={setKanbanHabilitado}
              />
              <PreferenceToggle
                checked={notificacaoInterna}
                disabled={!canEdit}
                label="Notificações internas"
                onChange={setNotificacaoInterna}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-(--duocal-text)">
                Fuso horário
              </label>
              <input
                className="duocal-input"
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                maxLength={80}
                disabled={!canEdit}
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <UsersRound className="size-4 text-(--duocal-primary)" />
              <h3 className="text-sm font-black text-(--duocal-text)">Membros conectados</h3>
            </div>

            <div className="space-y-2">
              {membros.map((membro) => (
                <div
                  key={membro.usuario_id}
                  className="flex items-center gap-3 rounded-2xl border border-(--duocal-border) bg-(--duocal-surface-soft) px-3 py-2.5"
                >
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-(--duocal-primary) text-xs font-black text-white">
                    {getIniciais(membro.nm_usuario)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-(--duocal-text)">
                      {membro.nm_usuario}
                    </p>
                    <p className="truncate text-xs text-(--duocal-muted)">
                      {membro.tp_papel === 'ADMIN' ? 'Admin' : 'Membro'} · {membro.ds_email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {codigoConvite ? (
            <section className="space-y-3">
              <h3 className="text-sm font-black text-(--duocal-text)">Convite</h3>
              <div className="rounded-2xl bg-(--duocal-surface-soft) px-4 py-3 text-center">
                <p className="text-2xl font-black tracking-[0.24em] text-(--duocal-primary)">
                  {codigoConvite}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-(--duocal-border) bg-white px-3 text-sm font-bold text-(--duocal-text)"
                >
                  <Copy className="size-4 text-(--duocal-muted)" />
                  Copiar
                </button>
                <button
                  type="button"
                  onClick={handleShareInvite}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #5466F1 0%, #B66DFF 100%)' }}
                >
                  <Share2 className="size-4" />
                  Compartilhar
                </button>
              </div>
            </section>
          ) : null}

          <div className="h-2" />
        </div>
      </div>

      <div className="shrink-0 border-t border-(--duocal-border) px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {canEdit ? (
          <Button
            className="w-full"
            isLoading={atualizarConfiguracao.isPending}
            onClick={handleSave}
          >
            Salvar configurações
          </Button>
        ) : (
          <Button className="w-full" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>
    </>
  )
}

function HorarioButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-2xl border px-2 py-2 text-xs font-black transition disabled:opacity-60"
      style={{
        borderColor: active ? 'var(--duocal-primary)' : 'var(--duocal-border)',
        backgroundColor: active ? 'rgba(84,102,241,0.10)' : '#fff',
        color: active ? 'var(--duocal-primary)' : 'var(--duocal-muted)',
      }}
    >
      {label}
    </button>
  )
}

function PreferenceToggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-(--duocal-border) bg-white px-3 py-2.5 text-left transition disabled:opacity-60"
    >
      <span className="text-sm font-semibold text-(--duocal-text)">{label}</span>
      <span
        className="flex h-6 w-11 items-center rounded-full p-0.5 transition"
        style={{
          backgroundColor: checked ? 'var(--duocal-primary)' : 'var(--duocal-border)',
          justifyContent: checked ? 'flex-end' : 'flex-start',
        }}
      >
        <span className="size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(17,20,74,0.18)]" />
      </span>
    </button>
  )
}

function getHorarioMode(hrInicioDia: string, hrFimDia: string): HorarioMode {
  if (hrInicioDia === '00:00' && hrFimDia === '23:00') return '24H'
  if (hrInicioDia === '06:00' && hrFimDia === '23:00') return 'UTIL'
  return 'CUSTOM'
}

function getIniciais(nome: string | null): string {
  if (!nome) return '?'
  const partes = nome.trim().split(/\s+/)
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}
