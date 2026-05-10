import type { EventoWorkspace } from '../../hooks'

type EventCardProps = {
  evento: EventoWorkspace
  onClick?: () => void
}

export function EventCard({ evento, onClick }: EventCardProps) {
  const cor = evento.cd_cor_categoria ?? '#5466F1'
  const inicio = formatarHora(evento.dt_inicio)
  const fim = formatarHora(evento.dt_fim)

  const nomes = (evento.participantes ?? [])
    .map((p) => firstName(p.nm_usuario))
    .join(', ')

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left"
    >
      <div
        className="flex items-start gap-3 rounded-[20px] p-3.5 shadow-[0_4px_16px_rgba(17,20,74,0.06)] transition hover:shadow-[0_6px_20px_rgba(17,20,74,0.10)]"
        style={{ backgroundColor: cor + '14', borderLeft: `3px solid ${cor}` }}
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-sm font-bold leading-snug"
            style={{ color: cor }}
          >
            {evento.nm_evento}
          </p>
          {nomes ? (
            <p className="mt-0.5 text-xs text-[var(--duocal-muted)]">{nomes}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold" style={{ color: cor }}>
            {evento.fl_dia_todo ? 'Dia todo' : inicio}
          </p>
          {!evento.fl_dia_todo && (
            <p className="text-[11px] text-[var(--duocal-muted)]">{fim}</p>
          )}
          {evento.nm_categoria ? (
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: cor + '22', color: cor }}
            >
              {evento.nm_categoria}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function firstName(nome: string | null) {
  return nome?.trim().split(/\s+/)[0] ?? ''
}
