import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { EventoWorkspace } from '../../hooks'
import { EventCard } from '../events/EventCard'
import {
  getEventoResponsavelVisual,
  type AgendaVisualMap,
} from './agendaVisual'
import { getMonthGridDays, isSameMonth } from './agendaMonthUtils'

const WEEKDAY_SHORT_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const WEEKDAY_ARIA_LABELS = [
  'Domingo',
  'Segunda',
  'Ter\u00e7a',
  'Quarta',
  'Quinta',
  'Sexta',
  'S\u00e1bado',
]

type AgendaMonthViewProps = {
  diaSelecionado: Date
  emptyMessage: string
  eventos: EventoWorkspace[]
  eventosPendentes: EventoWorkspace[]
  hoje: Date
  isLoading: boolean
  mesVisivel: Date
  visualMap: AgendaVisualMap
  onEventoClick: (evento: EventoWorkspace) => void
  onNextMonth: () => void
  onPreviousMonth: () => void
  onSelectDay: (dia: Date) => void
}

type DayEventGroup = {
  eventos: EventoWorkspace[]
  pendentes: EventoWorkspace[]
}

type DayMarker = {
  color: string
  key: string
}

function toDateISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date): boolean {
  return toDateISO(a) === toDateISO(b)
}

function getDayBounds(day: Date) {
  const inicio = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const fim = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)
  return { fim, inicio }
}

function eventoAconteceNoDia(evento: EventoWorkspace, day: Date): boolean {
  const { fim, inicio } = getDayBounds(day)
  const inicioEvento = new Date(evento.dt_inicio)
  const fimEvento = new Date(evento.dt_fim)

  return inicioEvento < fim && fimEvento > inicio
}

function ordenarEventos(eventos: EventoWorkspace[]): EventoWorkspace[] {
  return [...eventos].sort((a, b) => {
    if (a.fl_dia_todo !== b.fl_dia_todo) return a.fl_dia_todo ? -1 : 1
    return new Date(a.dt_inicio).getTime() - new Date(b.dt_inicio).getTime()
  })
}

function buildEventosPorDia(
  dias: Date[],
  eventos: EventoWorkspace[],
  eventosPendentes: EventoWorkspace[],
): Record<string, DayEventGroup> {
  return dias.reduce<Record<string, DayEventGroup>>((acc, dia) => {
    const key = toDateISO(dia)
    acc[key] = {
      eventos: ordenarEventos(eventos.filter((evento) => eventoAconteceNoDia(evento, dia))),
      pendentes: ordenarEventos(
        eventosPendentes.filter((evento) => eventoAconteceNoDia(evento, dia)),
      ),
    }
    return acc
  }, {})
}

function buildMarkers(
  eventos: EventoWorkspace[],
  eventosPendentes: EventoWorkspace[],
  visualMap: AgendaVisualMap,
): DayMarker[] {
  const markerMap = new Map<string, DayMarker>()

  for (const evento of [...eventos, ...eventosPendentes]) {
    const visual = getEventoResponsavelVisual(evento, visualMap)
    const key = evento.categoria_id ?? visual.id
    const marker = markerMap.get(key)

    if (marker) {
      continue
    }

    markerMap.set(key, {
      color: evento.cd_cor_categoria ?? visual.color,
      key,
    })
  }

  return Array.from(markerMap.values()).slice(0, 4)
}

function formatMonthTitle(date: Date): string {
  const monthYear = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  })
    .format(date)
    .replace(' de ', ' ')

  return monthYear.charAt(0).toUpperCase() + monthYear.slice(1)
}

function formatSelectedDay(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(date)
}

function LoadingDots() {
  return (
    <div className="flex min-h-28 items-center justify-center gap-1.5">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-2 animate-pulse rounded-full bg-(--duocal-primary)"
          style={{ animationDelay: `${index * 0.15}s` }}
        />
      ))}
    </div>
  )
}

export function AgendaMonthView({
  diaSelecionado,
  emptyMessage,
  eventos,
  eventosPendentes,
  hoje,
  isLoading,
  mesVisivel,
  visualMap,
  onEventoClick,
  onNextMonth,
  onPreviousMonth,
  onSelectDay,
}: AgendaMonthViewProps) {
  const diasGrade = getMonthGridDays(mesVisivel)
  const eventosPorDia = buildEventosPorDia(diasGrade, eventos, eventosPendentes)
  const selectedKey = toDateISO(diaSelecionado)
  const selectedGroup = eventosPorDia[selectedKey] ?? { eventos: [], pendentes: [] }
  const selectedEvents = ordenarEventos(selectedGroup.eventos)
  const selectedPendingEvents = ordenarEventos(selectedGroup.pendentes)
  const selectedCount = selectedEvents.length + selectedPendingEvents.length

  return (
    <section className="mx-3 overflow-hidden rounded-[30px] bg-white shadow-[0_4px_24px_rgba(17,20,74,0.07)]">
      <div className="flex items-center justify-between gap-3 border-b border-(--duocal-border) px-4 py-4">
        <button
          type="button"
          onClick={onPreviousMonth}
          aria-label="M\u00eas anterior"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-(--duocal-border) bg-(--duocal-surface-soft) text-(--duocal-muted) transition active:scale-[0.98] hover:text-(--duocal-primary)"
        >
          <ChevronLeft className="size-4" />
        </button>

        <div className="min-w-0 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-(--duocal-muted)">
            Calend\u00e1rio mensal
          </p>
          <h2 className="truncate text-xl font-black leading-tight text-(--duocal-text)">
            {formatMonthTitle(mesVisivel)}
          </h2>
        </div>

        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Pr\u00f3ximo m\u00eas"
          className="grid size-10 shrink-0 place-items-center rounded-full border border-(--duocal-border) bg-(--duocal-surface-soft) text-(--duocal-muted) transition active:scale-[0.98] hover:text-(--duocal-primary)"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-(--duocal-border) bg-(--duocal-surface-soft)">
        {WEEKDAY_SHORT_LABELS.map((label, index) => (
          <div
            key={`${label}-${index}`}
            aria-label={WEEKDAY_ARIA_LABELS[index]}
            className="grid h-9 place-items-center text-[11px] font-black text-(--duocal-muted)"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {diasGrade.map((dia) => {
          const key = toDateISO(dia)
          const group = eventosPorDia[key] ?? { eventos: [], pendentes: [] }
          const markers = buildMarkers(group.eventos, group.pendentes, visualMap)
          const totalEventos = group.eventos.length + group.pendentes.length
          const currentMonth = isSameMonth(dia, mesVisivel)
          const selected = key === selectedKey
          const today = isSameDay(dia, hoje)

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(dia)}
              className="min-h-[70px] border-b border-(--duocal-border) px-1.5 py-2 text-center transition active:scale-[0.98] hover:bg-[rgba(84,102,241,0.04)]"
              aria-label={`${dia.getDate()} de ${formatMonthTitle(dia)}, ${totalEventos} eventos`}
            >
              <span
                className={[
                  'mx-auto grid size-9 place-items-center rounded-full text-base font-black leading-none transition',
                  selected
                    ? 'text-white shadow-[0_8px_20px_rgba(84,102,241,0.30)]'
                    : today
                      ? 'bg-[rgba(84,102,241,0.10)] text-(--duocal-primary) ring-1 ring-(--duocal-primary)'
                      : currentMonth
                        ? 'text-(--duocal-text)'
                        : 'text-[rgba(107,114,128,0.52)]',
                ].join(' ')}
                style={
                  selected
                    ? { background: 'linear-gradient(135deg,#5466F1,#B66DFF)' }
                    : undefined
                }
              >
                {dia.getDate()}
              </span>

              {markers.length > 0 ? (
                <span className="mt-2 flex min-h-3 items-center justify-center gap-1">
                  {markers.slice(0, 3).map((marker) => (
                    <span
                      key={marker.key}
                      className="h-1.5 w-3.5 rounded-full"
                      style={{ backgroundColor: marker.color }}
                    />
                  ))}
                  {markers.length > 3 ? (
                    <span className="text-[9px] font-black leading-none text-(--duocal-muted)">
                      +{markers.length - 3}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="mt-2 block min-h-3" />
              )}
            </button>
          )
        })}
      </div>

      <div className="px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-(--duocal-muted)">
              Dia selecionado
            </p>
            <h3 className="mt-0.5 truncate text-base font-black capitalize text-(--duocal-text)">
              {formatSelectedDay(diaSelecionado)}
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-[rgba(84,102,241,0.10)] px-3 py-1 text-xs font-black text-(--duocal-primary)">
            {selectedCount} {selectedCount === 1 ? 'evento' : 'eventos'}
          </span>
        </div>

        {isLoading ? (
          <LoadingDots />
        ) : selectedCount > 0 ? (
          <div className="mt-4 space-y-3">
            {selectedEvents.map((evento) => (
              <EventCard
                key={evento.id}
                evento={evento}
                onClick={() => onEventoClick(evento)}
              />
            ))}
            {selectedPendingEvents.map((evento) => (
              <EventCard
                key={evento.id}
                evento={evento}
                isPending
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 flex min-h-28 flex-col items-center justify-center rounded-[24px] border border-dashed border-(--duocal-border) bg-(--duocal-surface-soft) px-5 text-center">
            <CalendarDays className="size-6 text-(--duocal-muted)" />
            <p className="mt-2 text-sm font-semibold text-(--duocal-text)">
              {emptyMessage}
            </p>
            <p className="mt-1 text-xs leading-5 text-(--duocal-muted)">
              Selecione outro dia ou crie um novo evento para esta data.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
