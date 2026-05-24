import type { EventoWorkspace, MembroWorkspace, ParticipanteEvento } from '../../hooks'

export type AgendaResponsavelVisual = {
  background: string
  border: string
  color: string
  id: string
  initials: string
  label: string
  solidBackground: string
  text: string
  type: 'casal' | 'membro' | 'sem-responsavel'
  avatarPath?: string | null
}

export type AgendaVisualMap = {
  byMemberId: Record<string, AgendaResponsavelVisual>
  casal: AgendaResponsavelVisual
  fallback: AgendaResponsavelVisual
}

type VisualPalette = Omit<
  AgendaResponsavelVisual,
  'id' | 'initials' | 'label' | 'type'
>

const memberPalettes: VisualPalette[] = [
  {
    background: 'rgba(84,102,241,0.13)',
    border: 'rgba(84,102,241,0.34)',
    color: 'var(--duocal-kayo)',
    solidBackground: 'var(--duocal-kayo)',
    text: '#2632A3',
  },
  {
    background: 'rgba(217,109,255,0.14)',
    border: 'rgba(217,109,255,0.36)',
    color: 'var(--duocal-athina)',
    solidBackground: 'var(--duocal-athina)',
    text: '#8B2FD2',
  },
  {
    background: 'rgba(22,163,74,0.12)',
    border: 'rgba(22,163,74,0.30)',
    color: '#16A34A',
    solidBackground: '#16A34A',
    text: '#166534',
  },
  {
    background: 'rgba(14,165,233,0.12)',
    border: 'rgba(14,165,233,0.32)',
    color: '#0284C7',
    solidBackground: '#0284C7',
    text: '#075985',
  },
  {
    background: 'rgba(245,158,11,0.14)',
    border: 'rgba(245,158,11,0.34)',
    color: '#D97706',
    solidBackground: '#D97706',
    text: '#92400E',
  },
]

const casalVisual: AgendaResponsavelVisual = {
  background:
    'linear-gradient(135deg, rgba(84,102,241,0.15), rgba(217,109,255,0.17))',
  border: 'rgba(182,109,255,0.38)',
  color: 'var(--duocal-casal)',
  id: 'casal',
  initials: 'C',
  label: 'Casal',
  solidBackground: 'linear-gradient(135deg,#5466F1,#D96DFF)',
  text: '#5B21B6',
  type: 'casal',
}

const fallbackVisual: AgendaResponsavelVisual = {
  background: 'rgba(107,114,128,0.10)',
  border: 'rgba(107,114,128,0.26)',
  color: '#6B7280',
  id: 'sem-responsavel',
  initials: '?',
  label: 'Sem responsavel',
  solidBackground: '#6B7280',
  text: '#374151',
  type: 'sem-responsavel',
}

export function buildAgendaVisualMap(membros: MembroWorkspace[]): AgendaVisualMap {
  const usedPaletteIndexes = new Set<number>()
  const byMemberId: Record<string, AgendaResponsavelVisual> = {}

  membros.forEach((membro, index) => {
    const paletteIndex = resolvePaletteIndex(membro.nm_usuario, index, usedPaletteIndexes)
    const palette = memberPalettes[paletteIndex]
    usedPaletteIndexes.add(paletteIndex)

    byMemberId[membro.usuario_id] = {
      ...palette,
      id: membro.usuario_id,
      initials: getInitials(membro.nm_usuario),
      label: getFirstName(membro.nm_usuario),
      type: 'membro',
      avatarPath: membro.avatar_path ?? null,
    }
  })

  return {
    byMemberId,
    casal: casalVisual,
    fallback: fallbackVisual,
  }
}

export function getEventoResponsavelVisual(
  evento: EventoWorkspace,
  visualMap: AgendaVisualMap,
) {
  const participantes = evento.participantes ?? []

  if (participantes.length > 1) {
    return visualMap.casal
  }

  const participante = participantes[0]

  if (!participante) {
    return visualMap.fallback
  }

  return visualMap.byMemberId[participante.usuario_id] ?? {
    ...visualMap.fallback,
    id: participante.usuario_id,
    initials: getInitials(participante.nm_usuario),
    label: getFirstName(participante.nm_usuario),
    type: 'membro' as const,
  }
}

export function getParticipantesLabel(participantes: ParticipanteEvento[]) {
  if (participantes.length > 1) {
    return 'Casal'
  }

  return getFirstName(participantes[0]?.nm_usuario ?? null)
}

function resolvePaletteIndex(
  nome: string | null,
  memberIndex: number,
  usedPaletteIndexes: Set<number>,
) {
  const normalizedName = normalizeText(nome)

  if (normalizedName.includes('kayo')) {
    return 0
  }

  if (normalizedName.includes('athina')) {
    return 1
  }

  const preferredIndex = memberIndex % memberPalettes.length

  if (!usedPaletteIndexes.has(preferredIndex)) {
    return preferredIndex
  }

  const availableIndex = memberPalettes.findIndex(
    (_palette, index) => !usedPaletteIndexes.has(index),
  )

  return availableIndex >= 0 ? availableIndex : preferredIndex
}

function normalizeText(value: string | null) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getFirstName(nome: string | null) {
  return nome?.trim().split(/\s+/)[0] || 'Membro'
}

function getInitials(nome: string | null) {
  const parts = nome?.trim().split(/\s+/).filter(Boolean) ?? []

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase()
}
