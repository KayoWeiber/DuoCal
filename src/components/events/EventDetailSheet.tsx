import { Calendar, Clock, Pencil, RefreshCw, Tag, Users, X } from 'lucide-react'
import type { EventoWorkspace } from '../../hooks'

type EventDetailSheetProps = {
  evento: EventoWorkspace
  onEdit: () => void
  onClose: () => void
}

const DIAS_SEMANA_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatarDataHora(dtInicio: string, dtFim: string, flDiaTodo: boolean): string {
  const inicio = new Date(dtInicio)
  const fmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const dataLabel = fmt.format(inicio)

  if (flDiaTodo) return `${dataLabel} · Dia todo`

  const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${dataLabel} · ${fmtHora.format(inicio)} – ${fmtHora.format(new Date(dtFim))}`
}

function formatarRecorrencia(evento: EventoWorkspace): string | null {
  if (!evento.fl_recorrente || !evento.tp_frequencia) return null

  if (evento.tp_frequencia === 'DIARIA') return 'Diária'
  if (evento.tp_frequencia === 'MENSAL') return 'Mensal'

  if (evento.tp_frequencia === 'SEMANAL') {
    const dias = (evento.dias_semana ?? [])
      .slice()
      .sort((a, b) => a - b)
      .map((d) => DIAS_SEMANA_LABEL[d])
      .join(', ')
    return dias ? `Semanal: ${dias}` : 'Semanal'
  }

  return null
}

export function EventDetailSheet({ evento, onEdit, onClose }: EventDetailSheetProps) {
  const cor = evento.cd_cor_categoria ?? '#5466F1'
  const nomes = (evento.participantes ?? []).map((p) => firstName(p.nm_usuario)).join(', ')
  const recorrencia = formatarRecorrencia(evento)
  const dataHora = formatarDataHora(evento.dt_inicio, evento.dt_fim, evento.fl_dia_todo)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,20,74,0.36)] backdrop-blur-sm">
      <div
        className="duocal-constrained-width flex w-full flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_-16px_60px_rgba(17,20,74,0.14)]"
        style={{ maxHeight: 'min(80dvh, 560px)' }}
      >
        {/* Handle */}
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-(--duocal-border)" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-(--duocal-border) px-5 pt-2 pb-4">
          {/* Cor do evento */}
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: cor }}
            />
            <h2 className="min-w-0 truncate text-lg font-black text-(--duocal-text)">
              {evento.nm_evento}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 grid size-9 shrink-0 place-items-center rounded-2xl bg-(--duocal-surface-soft) text-(--duocal-muted) transition hover:bg-[rgba(84,102,241,0.08)] hover:text-(--duocal-primary)"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3">

            {/* Data e hora */}
            <DetailRow icon={<Calendar className="size-4" style={{ color: cor }} />}>
              <span className="text-sm text-(--duocal-text)">{dataHora}</span>
            </DetailRow>

            {/* Horário (complemento visual quando não é dia todo) */}
            {!evento.fl_dia_todo && (
              <DetailRow icon={<Clock className="size-4 text-(--duocal-muted)" />}>
                <span className="text-sm text-(--duocal-muted)">
                  {new Date(evento.dt_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {' '}até{' '}
                  {new Date(evento.dt_fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </DetailRow>
            )}

            {/* Categoria */}
            {evento.nm_categoria && (
              <DetailRow icon={<Tag className="size-4" style={{ color: cor }} />}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: cor + '22', color: cor }}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: cor }} />
                  {evento.nm_categoria}
                </span>
              </DetailRow>
            )}

            {/* Participantes */}
            {nomes && (
              <DetailRow icon={<Users className="size-4 text-(--duocal-muted)" />}>
                <span className="text-sm text-(--duocal-text)">{nomes}</span>
              </DetailRow>
            )}

            {/* Recorrência */}
            {recorrencia && (
              <DetailRow icon={<RefreshCw className="size-4 text-(--duocal-primary)" />}>
                <span className="text-sm text-(--duocal-primary) font-medium">{recorrencia}</span>
              </DetailRow>
            )}

            {/* Descrição */}
            {evento.ds_evento && (
              <p className="mt-1 text-sm leading-5 text-(--duocal-muted)">
                {evento.ds_evento}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-(--duocal-border) px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] py-3.5 text-sm font-bold text-white transition"
            style={{ background: 'linear-gradient(135deg,#5466F1,#B66DFF)' }}
          >
            <Pencil className="size-4" />
            Editar evento
          </button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function firstName(nome: string | null) {
  return nome?.trim().split(/\s+/)[0] ?? ''
}
