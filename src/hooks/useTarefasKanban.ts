import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appVersion, supabase } from '../lib'

export type StatusTarefa = 'A_FAZER' | 'EM_ANDAMENTO' | 'PLANEJADO' | 'CONCLUIDO'
export type PrioridadeTarefa = 'BAIXA' | 'MEDIA' | 'ALTA'

export type TarefaKanban = {
  id: string
  workspace_id: string
  titulo: string
  descricao: string | null
  status: StatusTarefa
  prioridade: PrioridadeTarefa
  categoria_id: string | null
  nm_categoria: string | null
  cd_cor_categoria: string | null
  responsavel_id: string | null
  nm_responsavel: string | null
  dt_prazo: string | null
  dt_conclusao: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CriarTarefaPayload = {
  workspaceId: string
  titulo: string
  descricao?: string
  status?: StatusTarefa
  prioridade?: PrioridadeTarefa
  categoriaId?: string
  responsavelId?: string
  dtPrazo?: string
}

export type AtualizarTarefaPayload = CriarTarefaPayload & {
  tarefaId: string
}

export function tarefasKanbanQueryKey(workspaceId: string) {
  return ['duocal', appVersion, 'tarefas-kanban', workspaceId] as const
}

export function useTarefasKanban(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: tarefasKanbanQueryKey(workspaceId ?? ''),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
    networkMode: 'offlineFirst',
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_listar_tarefas_kanban', {
        p_workspace_id: workspaceId!,
      })

      if (error) throw error
      if (!data) return []

      return (Array.isArray(data) ? data : [data]) as TarefaKanban[]
    },
  })
}

export function useCriarTarefa() {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, CriarTarefaPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.rpc('rpc_criar_tarefa_kanban', {
        p_workspace_id:  payload.workspaceId,
        p_titulo:        payload.titulo,
        p_descricao:     payload.descricao ?? null,
        p_status:        payload.status ?? 'A_FAZER',
        p_prioridade:    payload.prioridade ?? 'MEDIA',
        p_categoria_id:  payload.categoriaId ?? null,
        p_responsavel_id: payload.responsavelId ?? null,
        p_dt_prazo:      payload.dtPrazo ?? null,
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tarefasKanbanQueryKey(variables.workspaceId),
        refetchType: 'all',
      })
    },
  })
}

export function useAtualizarTarefa() {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, AtualizarTarefaPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.rpc('rpc_atualizar_tarefa_kanban', {
        p_tarefa_id:     payload.tarefaId,
        p_workspace_id:  payload.workspaceId,
        p_titulo:        payload.titulo,
        p_descricao:     payload.descricao ?? null,
        p_status:        payload.status ?? 'A_FAZER',
        p_prioridade:    payload.prioridade ?? 'MEDIA',
        p_categoria_id:  payload.categoriaId ?? null,
        p_responsavel_id: payload.responsavelId ?? null,
        p_dt_prazo:      payload.dtPrazo ?? null,
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tarefasKanbanQueryKey(variables.workspaceId),
        refetchType: 'all',
      })
    },
  })
}

export function useAlterarStatusTarefa() {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, { tarefaId: string; workspaceId: string; status: StatusTarefa }>({
    mutationFn: async ({ tarefaId, workspaceId, status }) => {
      const { data, error } = await supabase.rpc('rpc_alterar_status_tarefa_kanban', {
        p_tarefa_id:    tarefaId,
        p_workspace_id: workspaceId,
        p_status:       status,
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tarefasKanbanQueryKey(variables.workspaceId),
        refetchType: 'all',
      })
    },
  })
}

export function useExcluirTarefa() {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, { tarefaId: string; workspaceId: string }>({
    mutationFn: async ({ tarefaId, workspaceId }) => {
      const { data, error } = await supabase.rpc('rpc_excluir_tarefa_kanban', {
        p_tarefa_id:    tarefaId,
        p_workspace_id: workspaceId,
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: tarefasKanbanQueryKey(variables.workspaceId),
        refetchType: 'all',
      })
    },
  })
}
