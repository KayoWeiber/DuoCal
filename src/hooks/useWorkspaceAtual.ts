import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buildQueryKey, supabase } from '../lib'
import { meuPerfilQueryKey, type MeuPerfil } from './useMeuPerfil'

type RelWorkspaceUsuario = {
  workspace_id: string
  tp_papel: string
  dt_entrada: string
}

type Workspace = {
  id: string
  nm_workspace: string
  ds_slogan: string
  tp_workspace: string
}

export type WorkspaceAtual = {
  workspace: Workspace
  tp_papel: string
  dt_entrada: string
  total_membros: number
}

export const workspaceAtualQueryKey = buildQueryKey('workspace-atual')
export const solicitacoesWorkspaceQueryKey = buildQueryKey(
  'solicitacoes-workspace-pendentes',
)
export const notificacoesSolicitacaoWorkspaceQueryKey = buildQueryKey(
  'minhas-notificacoes',
)

export function useWorkspaceAtual(perfil: MeuPerfil | null | undefined) {
  return useQuery({
    queryKey: workspaceAtualQueryKey,
    enabled: Boolean(perfil?.id && perfil.fl_perfil_completo),
    queryFn: () => obterWorkspaceAtual(perfil?.id),
    staleTime: 20_000,
  })
}

export type SolicitacaoWorkspacePendente = {
  solicitacao_id: string
  usuario_solicitante_id: string
  nm_usuario_solicitante: string
  workspace_id: string | null
  nm_workspace: string | null
  cd_codigo_utilizado: string
  dt_solicitacao: string
  ds_mensagem: string | null
}

export type NotificacaoSolicitacaoWorkspace = {
  notificacao_id: string
  workspace_id: string | null
  tp_notificacao: string
  nm_titulo: string
  ds_mensagem: string
  tp_entidade: string | null
  entidade_id: string | null
  fl_lida: boolean
  dt_lida: string | null
  dt_agendada: string | null
  dt_enviada: string | null
  created_at: string
}

export function useSolicitacoesWorkspacePendentes(enabled: boolean) {
  return useQuery({
    queryKey: solicitacoesWorkspaceQueryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'rpc_listar_solicitacoes_workspace_pendentes',
      )

      if (error) {
        throw error
      }

      return normalizeRpcRows<SolicitacaoWorkspacePendente>(data)
    },
    staleTime: 15_000,
  })
}

export function useNotificacoesSolicitacaoWorkspace(enabled: boolean) {
  return useMinhasNotificacoes(enabled)
}

export function useMinhasNotificacoes(enabled: boolean) {
  return useQuery({
    queryKey: notificacoesSolicitacaoWorkspaceQueryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'rpc_listar_minhas_notificacoes',
        {
          p_limite: 50,
        },
      )

      if (error) {
        throw error
      }

      return normalizeRpcRows<NotificacaoSolicitacaoWorkspace>(data)
    },
    staleTime: 15_000,
  })
}

export function useSolicitarConexaoPorCodigo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (codigo: string) => {
      const { data, error } = await supabase.rpc(
        'rpc_solicitar_conexao_por_codigo',
        {
          p_cd_codigo_conexao: codigo,
        },
      )

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: solicitacoesWorkspaceQueryKey })
      queryClient.invalidateQueries({
        queryKey: notificacoesSolicitacaoWorkspaceQueryKey,
      })
    },
  })
}

export function useResponderSolicitacaoWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { solicitacaoId: string; aceitar: boolean }) => {
      const { data, error } = await supabase.rpc(
        'rpc_responder_solicitacao_workspace',
        {
          p_solicitacao_id: payload.solicitacaoId,
          p_aceitar: payload.aceitar,
        },
      )

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: solicitacoesWorkspaceQueryKey })
      queryClient.invalidateQueries({
        queryKey: notificacoesSolicitacaoWorkspaceQueryKey,
      })
      queryClient.invalidateQueries({ queryKey: workspaceAtualQueryKey })
      queryClient.invalidateQueries({ queryKey: meuPerfilQueryKey })
    },
  })
}

export function useMarcarNotificacaoLida() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificacaoId: string) => {
      const { data, error } = await supabase.rpc(
        'rpc_marcar_notificacao_lida',
        {
          p_notificacao_id: notificacaoId,
        },
      )

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificacoesSolicitacaoWorkspaceQueryKey,
      })
    },
  })
}

export function useMarcarTodasNotificacoesLidas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        'rpc_marcar_todas_notificacoes_lidas',
      )

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificacoesSolicitacaoWorkspaceQueryKey,
      })
    },
  })
}

export function useCriarWorkspaceInicial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nmWorkspace: string) => {
      const { data, error } = await supabase.rpc(
        'rpc_criar_workspace_inicial',
        {
          p_nm_workspace: nmWorkspace,
          p_ds_slogan: 'Sincronia é a base de tudo',
        },
      )

      if (error) {
        throw error
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceAtualQueryKey })
    },
  })
}

async function obterWorkspaceAtual(usuarioId: string | undefined) {
  if (!usuarioId) {
    return null
  }

  const relResponse = await supabase
    .from('rel_workspace_usuario')
    .select('workspace_id,tp_papel,dt_entrada')
    .eq('usuario_id', usuarioId)
    .eq('fl_ativo', true)
    .order('dt_entrada', { ascending: true })
    .limit(1)

  if (relResponse.error) {
    throw relResponse.error
  }

  const rel = (relResponse.data?.[0] ?? null) as RelWorkspaceUsuario | null

  if (!rel) {
    return null
  }

  const workspaceResponse = await supabase
    .from('dim_workspace')
    .select('id,nm_workspace,ds_slogan,tp_workspace')
    .eq('id', rel.workspace_id)
    .maybeSingle()

  if (workspaceResponse.error) {
    throw workspaceResponse.error
  }

  if (!workspaceResponse.data) {
    return null
  }

  const countResponse = await supabase
    .from('rel_workspace_usuario')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', rel.workspace_id)
    .eq('fl_ativo', true)

  if (countResponse.error) {
    throw countResponse.error
  }

  return {
    workspace: workspaceResponse.data as Workspace,
    tp_papel: rel.tp_papel,
    dt_entrada: rel.dt_entrada,
    total_membros: countResponse.count ?? 1,
  } satisfies WorkspaceAtual
}

function normalizeRpcRows<T>(data: unknown) {
  if (!data) {
    return [] as T[]
  }

  return Array.isArray(data) ? (data as T[]) : ([data] as T[])
}
