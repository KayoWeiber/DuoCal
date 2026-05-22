import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  appVersion,
  buildQueryKey,
  cacheEventos,
  enqueueAction,
  getCachedEventos,
  supabase,
} from '../lib'

export type ParticipanteEvento = {
  usuario_id: string
  nm_usuario: string
  tp_participacao: 'RESPONSAVEL' | 'PARTICIPANTE' | 'CASAL'
  fl_responsavel_principal: boolean
}

export type EventoWorkspace = {
  id: string
  workspace_id: string
  nm_evento: string
  ds_evento: string | null
  dt_inicio: string
  dt_fim: string
  fl_dia_todo: boolean
  fl_bloqueia_horario: boolean
  fl_recorrente: boolean
  tp_status: string
  categoria_id: string | null
  nm_categoria: string | null
  cd_cor_categoria: string | null
  cd_icone_categoria: string | null
  participantes: ParticipanteEvento[]
}

export type MembroWorkspace = {
  usuario_id: string
  nm_usuario: string
  ds_email: string
  tp_papel: string
  dt_entrada: string
}

export type CriarEventoPayload = {
  workspaceId: string
  nmEvento: string
  dtInicio: string
  dtFim: string
  participantes: string[]
  dsEvento?: string
  categoriaId?: string
  flDiaTodo?: boolean
  flBloqueiaHorario?: boolean
  flRecorrente?: boolean
  tpFrequencia?: 'DIARIA' | 'SEMANAL' | 'MENSAL'
  intervalo?: number
  diasSemana?: number[]
  dtFimRecorrencia?: string
}

export type CriarEventoResult =
  | { offline: true; local_id: string }
  | { offline: false; data: unknown }

export function eventosWorkspaceQueryKey(
  workspaceId: string,
  dtInicio: string,
  dtFim: string,
) {
  return ['duocal', appVersion, 'eventos-workspace', workspaceId, dtInicio, dtFim] as const
}

export function membrosWorkspaceQueryKey(workspaceId: string) {
  return buildQueryKey('membros-workspace', workspaceId)
}

export function useEventosWorkspace(
  workspaceId: string | null | undefined,
  dtInicio: string,
  dtFim: string,
) {
  return useQuery({
    queryKey: eventosWorkspaceQueryKey(workspaceId ?? '', dtInicio, dtFim),
    enabled: Boolean(workspaceId && dtInicio && dtFim),
    staleTime: 30_000,
    networkMode: 'offlineFirst',
    queryFn: async () => {
      try {
        const result = await listarEventos(workspaceId!, dtInicio, dtFim)
        cacheEventos(workspaceId!, dtInicio, dtFim, result).catch(() => {})
        return result
      } catch {
        const cached = await getCachedEventos(workspaceId!, dtInicio, dtFim)
        if (cached !== null) return cached as EventoWorkspace[]
        throw new Error('Sem conexão e nenhum cache disponível para este período.')
      }
    },
  })
}

export function useMembrosWorkspace(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: membrosWorkspaceQueryKey(workspaceId ?? ''),
    enabled: Boolean(workspaceId),
    queryFn: () => listarMembros(workspaceId!),
    staleTime: 60_000,
    networkMode: 'offlineFirst',
  })
}

export function useCriarEvento() {
  const queryClient = useQueryClient()

  return useMutation<CriarEventoResult, Error, CriarEventoPayload>({
    mutationFn: async (payload: CriarEventoPayload) => {
      if (!navigator.onLine) {
        const sessionResult = await supabase.auth.getSession()
        const userId = sessionResult.data.session?.user.id ?? ''
        const localId = crypto.randomUUID()
        await enqueueAction({
          local_id: localId,
          type: 'CREATE_EVENT',
          payload: payload as unknown as Record<string, unknown>,
          workspace_id: payload.workspaceId,
          user_id: userId,
          created_at: new Date().toISOString(),
          status: 'pendente',
        })

        return { offline: true, local_id: localId }
      }

      const { data, error } = await supabase.rpc('rpc_criar_evento', {
        p_workspace_id:        payload.workspaceId,
        p_nm_evento:           payload.nmEvento,
        p_dt_inicio:           payload.dtInicio,
        p_dt_fim:              payload.dtFim,
        p_participantes:       payload.participantes,
        p_ds_evento:           payload.dsEvento ?? null,
        p_categoria_id:        payload.categoriaId ?? null,
        p_fl_dia_todo:         payload.flDiaTodo ?? false,
        p_fl_bloqueia_horario: payload.flBloqueiaHorario ?? true,
        p_fl_recorrente:       payload.flRecorrente ?? false,
        p_tp_frequencia:       payload.tpFrequencia ?? null,
        p_intervalo:           payload.intervalo ?? 1,
        p_dias_semana:         payload.diasSemana ?? null,
        p_dt_fim_recorrencia:  payload.dtFimRecorrencia ?? null,
      })

      if (error) throw error

      return { offline: false, data }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['duocal', appVersion, 'eventos-workspace', variables.workspaceId],
        exact: false,
      })
    },
  })
}

export function eventosHoje(eventos: EventoWorkspace[]): EventoWorkspace[] {
  const hoje = new Date()
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const fimHoje = new Date(inicioHoje.getTime() + 24 * 60 * 60 * 1000)

  return eventos.filter((e) => {
    const inicio = new Date(e.dt_inicio)
    const fim = new Date(e.dt_fim)
    return inicio < fimHoje && fim > inicioHoje
  })
}

export function proximoEvento(eventos: EventoWorkspace[]): EventoWorkspace | null {
  const agora = new Date()

  const proximos = eventos
    .filter((e) => new Date(e.dt_fim) > agora)
    .sort((a, b) => new Date(a.dt_inicio).getTime() - new Date(b.dt_inicio).getTime())

  return proximos[0] ?? null
}

async function listarEventos(
  workspaceId: string,
  dtInicio: string,
  dtFim: string,
): Promise<EventoWorkspace[]> {
  const { data, error } = await supabase.rpc('rpc_listar_eventos_workspace', {
    p_workspace_id: workspaceId,
    p_dt_inicio:    dtInicio,
    p_dt_fim:       dtFim,
  })

  if (error) throw error

  if (!data) return []

  const rows = Array.isArray(data) ? data : [data]

  return rows.map((row: Record<string, unknown>) => ({
    ...row,
    participantes: Array.isArray(row.participantes)
      ? row.participantes
      : row.participantes
        ? [row.participantes]
        : [],
  })) as EventoWorkspace[]
}

async function listarMembros(workspaceId: string): Promise<MembroWorkspace[]> {
  const { data, error } = await supabase.rpc('rpc_listar_membros_workspace', {
    p_workspace_id: workspaceId,
  })

  if (error) throw error

  if (!data) return []

  return Array.isArray(data) ? (data as MembroWorkspace[]) : [data as MembroWorkspace]
}
