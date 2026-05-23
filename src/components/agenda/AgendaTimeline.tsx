import { useEffect, useRef, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import type { EventoWorkspace } from '../../hooks'

// ─── Constantes ───────────────────────────────────────────────────────────────

const HORA_INICIO = 6
const HORA_FIM = 23
const PX_POR_HORA = 64
const COLUNA_HORA_PX = 48

const HORAS = Array.from(
  { length: HORA_FIM - HORA_INICIO + 1 },
  (_, i) => i + HORA_INICIO,
)

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EventoLayoutado = {
  evento: EventoWorkspace
  top: number
  height: number
  coluna: number
  totalColunas: number
  isPending: boolean
}

// ─── Utilitários de posição ───────────────────────────────────────────────────

function calcTop(iso: string): number {
  const d = new Date(iso)
  const h = Math.max(d.getHours() + d.getMinutes() / 60, HORA_INICIO)
  return (h - HORA_INICIO) * PX_POR_HORA
}

function calcHeight(dtInicio: string, dtFim: string, flDiaTodo: boolean): number {
  if (flDiaTodo) return (HORA_FIM - HORA_INICIO) * PX_POR_HORA

  const ini = new Date(dtInicio)
  const fim = new Date(dtFim)
  const iniH = Math.max(ini.getHours() + ini.getMinutes() / 60, HORA_INICIO)
  const fimH = Math.min(fim.getHours() + fim.getMinutes() / 60, HORA_FIM)
  return Math.max((fimH - iniH) * PX_POR_HORA, 36)
}

function calcTopAtual(): number {
  const agora = new Date()
  const h = agora.getHours() + agora.getMinutes() / 60
  if (h < HORA_INICIO || h > HORA_FIM) return -1
  return (h - HORA_INICIO) * PX_POR_HORA
}

function eVisivelNaTimeline(e: EventoWorkspace): boolean {
  if (e.fl_dia_todo) return true
  const h = new Date(e.dt_inicio).getHours() + new Date(e.dt_inicio).getMinutes() / 60
  const hf = new Date(e.dt_fim).getHours() + new Date(e.dt_fim).getMinutes() / 60
  return hf > HORA_INICIO && h < HORA_FIM
}

function calcLayout(
  eventos: EventoWorkspace[],
  pendentes: EventoWorkspace[],
): EventoLayoutado[] {
  const todos = [
    ...eventos.filter(eVisivelNaTimeline).map(e => ({ e, p: false })),
    ...pendentes.filter(eVisivelNaTimeline).map(e => ({ e, p: true })),
  ].sort((a, b) => new Date(a.e.dt_inicio).getTime() - new Date(b.e.dt_inicio).getTime())

  if (todos.length === 0) return []

  // Greedy column assignment
  const colFim: number[] = []
  const assigned: number[] = []

  todos.forEach(({ e }, i) => {
    const ini = new Date(e.dt_inicio).getTime()
    const fim = new Date(e.dt_fim).getTime()
    let col = colFim.findIndex(f => f <= ini)
    if (col === -1) { col = colFim.length; colFim.push(fim) }
    else colFim[col] = Math.max(colFim[col], fim)
    assigned[i] = col
  })

  // totalColunas = max col among overlapping events + 1
  return todos.map(({ e, p }, i) => {
    const ini = new Date(e.dt_inicio).getTime()
    const fim = new Date(e.dt_fim).getTime()
    const maxCol = todos.reduce((mx, { e: b }, j) => {
      const bi = new Date(b.dt_inicio).getTime()
      const bf = new Date(b.dt_fim).getTime()
      return bi < fim && bf > ini ? Math.max(mx, assigned[j]) : mx
    }, 0)
    return {
      evento: e,
      top: calcTop(e.dt_inicio),
      height: calcHeight(e.dt_inicio, e.dt_fim, e.fl_dia_todo),
      coluna: assigned[i],
      totalColunas: maxCol + 1,
      isPending: p,
    }
  })
}

// ─── Evento na timeline ───────────────────────────────────────────────────────

function EventoTimeline({
  evento,
  top,
  height,
  coluna,
  totalColunas,
  isPending,
  onClick,
}: EventoLayoutado & { onClick?: () => void }) {
  const cor = evento.cd_cor_categoria ?? '#5466F1'
  const tini = new Date(evento.dt_inicio).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })
  const tfim = new Date(evento.dt_fim).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit',
  })
  const curto = height < 52

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={evento.nm_evento}
      className="absolute flex flex-col overflow-hidden rounded-xl text-left transition active:scale-[0.98] active:opacity-70"
      style={{
        top: top + 2,
        height: height - 4,
        left: `calc(${(coluna / totalColunas) * 100}% + 2px)`,
        width: `calc(${(1 / totalColunas) * 100}% - 4px)`,
        backgroundColor: `${cor}1F`,
        borderLeft: `3px solid ${cor}`,
        padding: curto ? '2px 6px' : '5px 8px',
        opacity: isPending ? 0.78 : 1,
      }}
    >
      {curto ? (
        <p className="truncate text-[10px] font-bold leading-tight" style={{ color: cor }}>
          {tini} · {evento.nm_evento}
        </p>
      ) : (
        <>
          <p className="shrink-0 text-[10px] leading-none" style={{ color: `${cor}99` }}>
            {evento.fl_dia_todo ? 'Dia todo' : `${tini}–${tfim}`}
          </p>
          <p
            className="mt-0.5 font-bold leading-snug"
            style={{
              color: cor,
              fontSize: 12,
              display: '-webkit-box',
              WebkitLineClamp: height > 72 ? 2 : 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {evento.nm_evento}
          </p>
          {height > 88 && evento.nm_categoria && (
            <span
              className="mt-auto inline-flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
              style={{ backgroundColor: `${cor}28`, color: cor }}
            >
              <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
              <span className="truncate">{evento.nm_categoria}</span>
            </span>
          )}
        </>
      )}

      {evento.fl_recorrente && height >= 52 && (
        <RefreshCw
          className="pointer-events-none absolute bottom-1 right-1.5 opacity-40"
          style={{ color: cor, width: 9, height: 9 }}
        />
      )}
      {isPending && (
        <CloudOff
          className="pointer-events-none absolute top-1 right-1.5"
          style={{ width: 10, height: 10, color: '#D97706' }}
        />
      )}
    </button>
  )
}

// ─── Timeline ────────────────────────────────────────────────────────────────

export type AgendaTimelineProps = {
  eventos: EventoWorkspace[]
  eventosPendentes: EventoWorkspace[]
  diaSelecionado: Date
  onEventoClick: (evento: EventoWorkspace) => void
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AgendaTimeline({
  eventos,
  eventosPendentes,
  diaSelecionado,
  onEventoClick,
}: AgendaTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [topAtual, setTopAtual] = useState(calcTopAtual)

  const eHoje = toISODate(diaSelecionado) === toISODate(new Date())

  useEffect(() => {
    const id = setInterval(() => setTopAtual(calcTopAtual()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Scroll para o horário atual ao trocar de dia
  useEffect(() => {
    if (!scrollRef.current) return
    const top = calcTopAtual()
    scrollRef.current.scrollTop = eHoje && top >= 0 ? Math.max(top - 100, 0) : 0
  }, [diaSelecionado, eHoje])

  const layoutados = calcLayout(eventos, eventosPendentes)
  const alturaTotal = (HORA_FIM - HORA_INICIO + 1) * PX_POR_HORA

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide transition-colors duration-200"
      style={{ backgroundColor: eHoje ? '#ffffff' : 'var(--duocal-surface-soft)' }}
    >
      <div className="relative flex pb-6" style={{ minHeight: alturaTotal }}>

        {/* Coluna de horas */}
        <div className="shrink-0 select-none" style={{ width: COLUNA_HORA_PX }}>
          {HORAS.map((hora) => (
            <div
              key={hora}
              className="flex items-start justify-end pr-3"
              style={{ height: PX_POR_HORA }}
            >
              <span
                className="text-[10px] font-medium leading-none"
                style={{
                  color: eHoje ? 'var(--duocal-muted)' : 'rgba(107,114,128,0.55)',
                  marginTop: '-7px',
                }}
              >
                {`${String(hora).padStart(2, '0')}:00`}
              </span>
            </div>
          ))}
        </div>

        {/* Grade + eventos */}
        <div
          className="relative flex-1 min-w-0"
          style={{ height: alturaTotal, opacity: eHoje ? 1 : 0.72 }}
        >
          {/* Linhas de hora */}
          {HORAS.map((hora) => (
            <div
              key={hora}
              className="pointer-events-none absolute inset-x-0"
              style={{
                top: (hora - HORA_INICIO) * PX_POR_HORA,
                borderTop: '1px solid var(--duocal-border)',
              }}
            />
          ))}

          {/* Linha do horário atual — apenas no dia de hoje */}
          {eHoje && topAtual >= 0 && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              style={{ top: topAtual }}
            >
              <div
                className="shrink-0 rounded-full bg-red-500"
                style={{ width: 9, height: 9, marginLeft: -4 }}
              />
              <div className="flex-1 border-t-[2px] border-red-500" />
            </div>
          )}

          {/* Eventos */}
          {layoutados.map((l) => (
            <EventoTimeline
              key={`${l.evento.id}-${l.top}`}
              {...l}
              onClick={l.isPending ? undefined : () => onEventoClick(l.evento)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
