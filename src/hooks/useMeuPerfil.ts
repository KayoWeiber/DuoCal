import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buildQueryKey, supabase } from '../lib'

export type MeuPerfil = {
  id: string
  auth_user_id: string
  nm_usuario: string | null
  ds_email: string
  cd_codigo_conexao: string
  url_avatar: string | null
  avatar_path: string | null
  fl_perfil_completo: boolean
  dt_perfil_completo: string | null
  dt_ultimo_login: string | null
  fl_ativo: boolean
  created_at: string
  updated_at: string
}

export const meuPerfilQueryKey = buildQueryKey('meu-perfil')

export function useMeuPerfil(enabled: boolean) {
  return useQuery({
    queryKey: meuPerfilQueryKey,
    enabled,
    queryFn: obterMeuPerfil,
    staleTime: 20_000,
  })
}

export function useCompletarPerfilUsuario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { nmUsuario: string; urlAvatar?: string }) => {
      const { data, error } = await supabase.rpc(
        'rpc_completar_perfil_usuario',
        {
          p_nm_usuario: payload.nmUsuario,
          p_url_avatar: payload.urlAvatar ?? null,
        },
      )

      if (error) {
        throw error
      }

      return normalizePerfil(normalizeRpcRow<MeuPerfil>(data))
    },
    onSuccess: (perfil) => {
      queryClient.setQueryData(meuPerfilQueryKey, normalizePerfil(perfil))
      queryClient.invalidateQueries({ queryKey: meuPerfilQueryKey })
    },
  })
}

export function useAtualizarAvatarUsuario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (avatarPath: string) => {
      const { data, error } = await supabase.rpc('rpc_atualizar_avatar_usuario', {
        p_avatar_path: avatarPath,
      })

      if (error) throw error

      return normalizePerfil(normalizeRpcRow<MeuPerfil>(data))
    },
    onSuccess: (perfil) => {
      if (perfil) {
        queryClient.setQueryData(meuPerfilQueryKey, normalizePerfil(perfil))
      }
      queryClient.invalidateQueries({ queryKey: meuPerfilQueryKey })
      queryClient.invalidateQueries({
        queryKey: buildQueryKey('membros-workspace'),
        exact: false,
      })
    },
  })
}

export function useRemoverAvatarUsuario() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('rpc_remover_avatar_usuario')

      if (error) throw error

      return normalizePerfil(normalizeRpcRow<MeuPerfil>(data))
    },
    onSuccess: (perfil) => {
      if (perfil) {
        queryClient.setQueryData(meuPerfilQueryKey, normalizePerfil(perfil))
      }
      queryClient.invalidateQueries({ queryKey: meuPerfilQueryKey })
      queryClient.invalidateQueries({
        queryKey: buildQueryKey('membros-workspace'),
        exact: false,
      })
    },
  })
}

export function useRegistrarLoginUsuario() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('rpc_registrar_login_usuario')

      if (error) {
        throw error
      }
    },
  })
}

async function obterMeuPerfil() {
  const { data, error } = await supabase.rpc('rpc_obter_meu_perfil')

  if (!error) {
    return normalizePerfil(normalizeRpcRow<MeuPerfil>(data))
  }

  if (!isPerfilNaoEncontrado(error)) {
    throw error
  }

  const fallback = await supabase.rpc('rpc_criar_perfil_usuario', {
    p_nm_usuario: null,
  })

  if (fallback.error) {
    throw fallback.error
  }

  return normalizePerfil(normalizeRpcRow<MeuPerfil>(fallback.data))
}

function normalizeRpcRow<T>(data: unknown) {
  if (Array.isArray(data)) {
    return (data[0] ?? null) as T | null
  }

  return data as T | null
}

function normalizePerfil(perfil: MeuPerfil | null) {
  if (!perfil) {
    return null
  }

  return {
    ...perfil,
    cd_codigo_conexao: perfil.cd_codigo_conexao ?? '',
    avatar_path: perfil.avatar_path ?? null,
  } satisfies MeuPerfil
}

function isPerfilNaoEncontrado(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const message = (error as { message?: unknown }).message
  return typeof message === 'string' && message.includes('PERFIL_NAO_ENCONTRADO')
}
