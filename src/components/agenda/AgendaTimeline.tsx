import { useEffect, useMemo, useRef, useState } from 'react'
import { CloudOff, RefreshCw } from 'lucide-react'
import type { EventoWorkspace } from '../../hooks'
import {
  getEventoResponsavelVisual,
  getParticipantesLabel,
  type AgendaVisualMap,
} from './agendaVisual'

const HORA_INICIO_PADRAO = 6
const HORA_FIM_PADRAO = 23
const PX_POR_HORA = 72
const COLUNA_HORA_PX = 48
const MS_POR_HORA = 60 * 60 * 1000
const TOUCH_SPACING_MS = 8 * 60 * 1000

type TimelineRange = {
  startHour: number
  endHour: number
  endExclusiveHour: number
  hours: number[]
  totalHeight: number
}

type EventoLayoutado = {
  evento: EventoWorkspace
  top: number
  height: number
  coluna: number
  totalColunas: number
  isPending: boolean
}

type EventoComIntervalo = {
  evento: EventoWorkspace
  isPending: boolean
  startMs: number
  endMs: number
  startHour: number
  endHour: number
}

export type AgendaTimelineProps = {
  eventos: EventoWorkspace[]
  eventosPendentes: EventoWorkspace[]
  diaSelecionado: Date
  visualMap: AgendaVisualMap
  hrInicioDia?: string
  hrFimDia?: string
  autoScrollToCurrent?: boolean
  onEventoClick: (evento: EventoWorkspace) => void
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function parseHoraLabel(value: string | null | undefined, fallback: number) {
  if (!value) return fallback
  const [hora] = value.split(':')
  const parsed = Number(hora)
  return Number.isFinite(parsed) ? clamp(parsed, 0, 23) : fallback
}

function criarRange(startHour: number, endHour: number): TimelineRange {
  const normalizedStart = clamp(startHour, 0, 23)
  const normalizedEnd = clamp(
    Math.max(endHour, normalizedStart),
    normalizedStart,
    23,
  )
  const hours = Array.from(
    { length: normalizedEnd - normalizedStart + 1 },
    (_value, index) => index + normalizedStart,
  )

  return {
    startHour: normalizedStart,
    endHour: normalizedEnd,
    endExclusiveHour: normalizedEnd + 1,
    hours,
    totalHeight: (normalizedEnd - normalizedStart + 1) * PX_POR_HORA,
  }
}

function getDayBounds(dia: Date) {
  const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate())
  const fim = new Date(inicio.getTime() + 24 * MS_POR_HORA)
  return { fim, inicio }
}

function getHourInDay(ms: number, dayStartMs: number) {
  return (ms - dayStartMs) / MS_POR_HORA
}

function getEventoIntervalo(
  evento: EventoWorkspace,
  diaSelecionado: Date,
  isPending: boolean,
): EventoComIntervalo | null {
  const { inicio, fim } = getDayBounds(diaSelecionado)
  const dayStartMs = inicio.getTime()
  const dayEndMs = fim.getTime()
  const rawStartMs = evento.fl_dia_todo
    ? dayStartMs
    : new Date(evento.dt_inicio).getTime()
  const rawEndMs = evento.fl_dia_todo
    ? dayEndMs
    : new Date(evento.dt_fim).getTime()
  const startMs = Math.max(rawStartMs, dayStartMs)
  const endMs = Math.min(rawEndMs, dayEndMs)

  if (endMs <= startMs) return null

  return {
    endHour: getHourInDay(endMs, dayStartMs),
    endMs,
    evento,
    isPending,
    startHour: getHourInDay(startMs, dayStartMs),
    startMs,
  }
}

function resolverRangeTimeline({
  eventos,
  eventosPendentes,
  diaSelecionado,
  hrInicioDia,
  hrFimDia,
}: Pick<
  AgendaTimelineProps,
  'diaSelecionado' | 'eventos' | 'eventosPendentes' | 'hrFimDia' | 'hrInicioDia'
>) {
  const inicioConfigurado = parseHoraLabel(hrInicioDia, HORA_INICIO_PADRAO)
  const fimConfigurado = parseHoraLabel(hrFimDia, HORA_FIM_PADRAO)
  const intervalos = [
    ...eventos.map((evento) => getEventoIntervalo(evento, diaSelecionado, false)),
    ...eventosPendentes.map((evento) =>
      getEventoIntervalo(evento, diaSelecionado, true),
    ),
  ].filter((intervalo): intervalo is EventoComIntervalo => Boolean(intervalo))

  const temEventoNaMadrugada = intervalos.some(
    ({ evento, startHour }) => !evento.fl_dia_todo && startHour < inicioConfigurado,
  )
  const fimComEventos = intervalos.reduce((maiorFim, { evento, endHour }) => {
    if (evento.fl_dia_todo) return maiorFim
    return Math.max(maiorFim, Math.ceil(endHour) - 1)
  }, fimConfigurado)

  return criarRange(
    temEventoNaMadrugada ? 0 : inicioConfigurado,
    Math.max(fimConfigurado, fimComEventos),
  )
}

function calcTopAtual(range: TimelineRange): number {
  const agora = new Date()
  const horaAtual = agora.getHours() + agora.getMinutes() / 60
  if (horaAtual < range.startHour || horaAtual > range.endExclusiveHour) return -1
  return (horaAtual - range.startHour) * PX_POR_HORA
}

function calcTop(intervalo: EventoComIntervalo, range: TimelineRange): number {
  const startHour = clamp(
    intervalo.startHour,
    range.startHour,
    range.endExclusiveHour,
  )
  return (startHour - range.startHour) * PX_POR_HORA
}

function calcHeight(intervalo: EventoComIntervalo, range: TimelineRange): number {
  if (intervalo.evento.fl_dia_todo) return range.totalHeight

  const startHour = clamp(
    intervalo.startHour,
    range.startHour,
    range.endExclusiveHour,
  )
  const endHour = clamp(intervalo.endHour, range.startHour, range.endExclusiveHour)
  return Math.max((endHour - startHour) * PX_POR_HORA, 44)
}

function calcLayout(
  eventos: EventoWorkspace[],
  pendentes: EventoWorkspace[],
  diaSelecionado: Date,
  range: TimelineRange,
): EventoLayoutado[] {
  const todos = [
    ...eventos.map((evento) => getEventoIntervalo(evento, diaSelecionado, false)),
    ...pendentes.map((evento) => getEventoIntervalo(evento, diaSelecionado, true)),
  ]
    .filter((intervalo): intervalo is EventoComIntervalo => Boolean(intervalo))
    .filter(
      (intervalo) =>
        intervalo.endHour > range.startHour &&
        intervalo.startHour < range.endExclusiveHour,
    )
    .sort((a, b) => a.startMs - b.startMs)

  if (todos.length === 0) return []

  const colFim: number[] = []
  const assigned: number[] = []

  todos.forEach(({ startMs, endMs }, index) => {
    let col = colFim.findIndex((fim) => fim + TOUCH_SPACING_MS <= startMs)

    if (col === -1) {
      col = colFim.length
      colFim.push(endMs)
    } else {
      colFim[col] = Math.max(colFim[col], endMs)
    }

    assigned[index] = col
  })

  return todos.map((intervalo, index) => {
    const maxCol = todos.reduce((maiorColuna, outroIntervalo, outroIndex) => {
      const sobrepoe =
        outroIntervalo.startMs < intervalo.endMs + TOUCH_SPACING_MS &&
        outroIntervalo.endMs + TOUCH_SPACING_MS > intervalo.startMs

      return sobrepoe ? Math.max(maiorColuna, assigned[outroIndex]) : maiorColuna
    }, 0)

    return {
      coluna: assigned[index],
      evento: intervalo.evento,
      height: calcHeight(intervalo, range),
      isPending: intervalo.isPending,
      top: calcTop(intervalo, range),
      totalColunas: maxCol + 1,
    }
  })
}

function EventoTimeline({
  evento,
  top,
  height,
  coluna,
  totalColunas,
  isPending,
  visualMap,
  onClick,
}: EventoLayoutado & { visualMap: AgendaVisualMap; onClick?: () => void }) {
  const visual = getEventoResponsavelVisual(evento, visualMap)
  const categoriaCor = evento.cd_cor_categoria ?? visual.color
  const tini = new Date(evento.dt_inicio).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const tfim = new Date(evento.dt_fim).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const curto = height < 58
  const narrow = totalColunas > 1
  const participantesLabel = getParticipantesLabel(evento.participantes ?? [])

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${evento.nm_evento}, ${participantesLabel}`}
      className="absolute flex flex-col overflow-hidden rounded-2xl border text-left shadow-[0_8px_22px_rgba(17,20,74,0.08)] transition hover:shadow-[0_10px_26px_rgba(17,20,74,0.12)] active:scale-[0.98] active:opacity-70"
      style={{
        top: top + 3,
        height: Math.max(height - 6, 38),
        left: `calc(${(coluna / totalColunas) * 100}% + 3px)`,
        width: `calc(${(1 / totalColunas) * 100}% - 6px)`,
        background: visual.background,
        borderColor: visual.border,
        borderLeft: `4px solid ${visual.color}`,
        padding: curto ? '4px 6px' : '7px 8px',
        opacity: isPending ? 0.78 : 1,
      }}
    >
      {curto ? (
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="grid size-5 shrink-0 place-items-center rounded-full text-[8px] font-black text-white"
            style={{ background: visual.solidBackground }}
          >
            {visual.initials}
          </span>
          <p
            className="min-w-0 truncate text-[10px] font-black leading-tight"
            style={{ color: visual.text }}
          >
            {tini} · {evento.nm_evento}
          </p>
        </div>
      ) : (
        <>
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className="grid size-6 shrink-0 place-items-center rounded-full text-[9px] font-black text-white shadow-[0_2px_8px_rgba(17,20,74,0.12)]"
              style={{ background: visual.solidBackground }}
            >
              {visual.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[10px] font-black leading-none"
                style={{ color: visual.text }}
              >
                {evento.fl_dia_todo ? 'Dia todo' : `${tini}-${tfim}`}
              </p>
              {!narrow ? (
                <p className="mt-0.5 truncate text-[9px] font-semibold leading-none text-(--duocal-muted)">
                  {visual.label}
                </p>
              ) : null}
            </div>
          </div>

          <p
            className="mt-1 min-w-0 font-black leading-snug text-(--duocal-text)"
            style={{
              display: '-webkit-box',
              fontSize: narrow ? 11 : 12,
              overflow: 'hidden',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: height > 72 ? 2 : 1,
            }}
          >
            {evento.nm_evento}
          </p>

          {height > 92 && evento.nm_categoria && !narrow ? (
            <span className="mt-auto inline-flex max-w-full items-center gap-1 rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-bold text-(--duocal-muted)">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: categoriaCor }}
              />
              <span className="truncate">{evento.nm_categoria}</span>
            </span>
          ) : null}
        </>
      )}

      {evento.fl_recorrente && height >= 52 ? (
        <RefreshCw
          className="pointer-events-none absolute bottom-1 right-1.5 opacity-40"
          style={{ color: visual.color, width: 9, height: 9 }}
        />
      ) : null}

      {isPending ? (
        <CloudOff
          className="pointer-events-none absolute top-1 right-1.5"
          style={{ width: 10, height: 10, color: '#D97706' }}
        />
      ) : null}
    </button>
  )
}

export function AgendaTimeline({
  eventos,
  eventosPendentes,
  diaSelecionado,
  visualMap,
  hrInicioDia,
  hrFimDia,
  autoScrollToCurrent = true,
  onEventoClick,
}: AgendaTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const eHoje = toISODate(diaSelecionado) === toISODate(new Date())
  const range = useMemo(
    () =>
      resolverRangeTimeline({
        diaSelecionado,
        eventos,
        eventosPendentes,
        hrFimDia,
        hrInicioDia,
      }),
    [eventos, eventosPendentes, diaSelecionado, hrInicioDia, hrFimDia],
  )
  const layoutados = useMemo(
    () => calcLayout(eventos, eventosPendentes, diaSelecionado, range),
    [eventos, eventosPendentes, diaSelecionado, range],
  )
  const [topAtual, setTopAtual] = useState(() => calcTopAtual(range))

  useEffect(() => {
    const refreshTopAtual = () => setTopAtual(calcTopAtual(range))
    const timer = window.setTimeout(refreshTopAtual, 0)
    const id = window.setInterval(refreshTopAtual, 60_000)

    return () => {
      window.clearTimeout(timer)
      window.clearInterval(id)
    }
  }, [range])

  useEffect(() => {
    if (!scrollRef.current) return

    const top = calcTopAtual(range)
    scrollRef.current.scrollTop =
      autoScrollToCurrent && eHoje && top >= 0 ? Math.max(top - 100, 0) : 0
  }, [autoScrollToCurrent, diaSelecionado, eHoje, range])

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-hide transition-colors duration-200"
      style={{
        WebkitOverflowScrolling: 'touch',
        backgroundColor: eHoje ? '#ffffff' : 'var(--duocal-surface-soft)',
      }}
    >
      <div
        className="relative flex pb-[calc(6rem+env(safe-area-inset-bottom))]"
        style={{ minHeight: range.totalHeight }}
      >
        <div className="shrink-0 select-none" style={{ width: COLUNA_HORA_PX }}>
          {range.hours.map((hora) => (
            <div
              key={hora}
              className="flex items-start justify-end pr-3"
              style={{ height: PX_POR_HORA }}
            >
              <span
                className="text-[10px] font-medium leading-none"
                style={{
                  color: eHoje
                    ? 'var(--duocal-muted)'
                    : 'rgba(107,114,128,0.55)',
                  marginTop: '-7px',
                }}
              >
                {`${String(hora).padStart(2, '0')}:00`}
              </span>
            </div>
          ))}
        </div>

        <div
          className="relative min-w-0 flex-1"
          style={{ height: range.totalHeight, opacity: eHoje ? 1 : 0.72 }}
        >
          {range.hours.map((hora) => (
            <div
              key={hora}
              className="pointer-events-none absolute inset-x-0"
              style={{
                borderTop: '1px solid var(--duocal-border)',
                top: (hora - range.startHour) * PX_POR_HORA,
              }}
            />
          ))}

          {eHoje && topAtual >= 0 ? (
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
          ) : null}

          {layoutados.map((layout) => (
            <EventoTimeline
              key={`${layout.evento.id}-${layout.top}`}
              {...layout}
              visualMap={visualMap}
              onClick={layout.isPending ? undefined : () => onEventoClick(layout.evento)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
