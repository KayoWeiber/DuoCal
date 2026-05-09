import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buildQueryKey, supabase } from '../lib'
import type { MeuPerfil } from './useMeuPerfil'

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

export function useWorkspaceAtual(perfil: MeuPerfil | null | undefined) {
  return useQuery({
    queryKey: workspaceAtualQueryKey,
    enabled: Boolean(perfil?.id && perfil.fl_perfil_completo),
    queryFn: () => obterWorkspaceAtual(perfil?.id),
    staleTime: 20_000,
  })
}

export function useConectarUsuarioPorToken() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc(
        'rpc_conectar_usuario_por_token',
        {
          p_cd_token_conexao: token,
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
