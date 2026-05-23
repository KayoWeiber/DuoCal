import type { PrioridadeTarefa, StatusTarefa } from '../../hooks'

export const STATUS_CONFIG: Record<StatusTarefa, { label: string; cor: string; bg: string }> = {
  A_FAZER: { label: 'A fazer', cor: '#6B7280', bg: '#6B728015' },
  EM_ANDAMENTO: { label: 'Em andamento', cor: '#F59E0B', bg: '#F59E0B15' },
  PLANEJADO: { label: 'Planejado', cor: '#5466F1', bg: '#5466F115' },
  CONCLUIDO: { label: 'Concluído', cor: '#10B981', bg: '#10B98115' },
}

export const PRIORIDADE_CONFIG: Record<PrioridadeTarefa, { label: string; cor: string }> = {
  BAIXA: { label: 'Baixa', cor: '#10B981' },
  MEDIA: { label: 'Média', cor: '#F59E0B' },
  ALTA: { label: 'Alta', cor: '#EF4444' },
}
