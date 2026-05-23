import { CloudOff, RefreshCw } from 'lucide-react'
import type { EventoWorkspace } from '../../hooks'

type EventCardProps = {
  evento: EventoWorkspace
  onClick?: () => void
  isPending?: boolean
}

export function EventCard({ evento, onClick, isPending = false }: EventCardProps) {
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
        style={{
          backgroundColor: cor + '14',
          borderLeft: `3px solid ${cor}`,
          opacity: isPending ? 0.82 : 1,
        }}
      >
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-bold leading-snug"
            style={{ color: cor }}
          >
            {evento.nm_evento}
          </p>
          {isPending ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-600">
              <CloudOff className="size-3 shrink-0" />
              Pendente de envio
            </p>
          ) : nomes ? (
            <p className="mt-0.5 text-xs text-(--duocal-muted)">{nomes}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold" style={{ color: cor }}>
            {evento.fl_dia_todo ? 'Dia todo' : inicio}
          </p>
          {!evento.fl_dia_todo && (
            <p className="text-[11px] text-(--duocal-muted)">{fim}</p>
          )}
          {evento.nm_categoria ? (
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: cor + '22', color: cor }}
            >
              {evento.nm_categoria}
            </span>
          ) : null}
          {evento.fl_recorrente && (
            <div className="mt-1 flex items-center justify-end">
              <RefreshCw className="size-3 opacity-60" style={{ color: cor }} />
            </div>
          )}
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
