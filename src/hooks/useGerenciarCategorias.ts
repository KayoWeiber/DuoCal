import { useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriasEventoQueryKey } from './useCategoriasEvento'
import { supabase } from '../lib'

export type CriarCategoriaPayload = {
  workspaceId: string
  nmCategoria: string
  cdCor: string
}

export type AtualizarCategoriaPayload = {
  categoriaId: string
  workspaceId: string
  nmCategoria: string
  cdCor: string
}

export type DesativarCategoriaPayload = {
  categoriaId: string
  workspaceId: string
}

export function useCriarCategoria() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CriarCategoriaPayload) => {
      const { data, error } = await supabase.rpc('rpc_criar_categoria', {
        p_workspace_id: payload.workspaceId,
        p_nm_categoria: payload.nmCategoria,
        p_cd_cor:       payload.cdCor,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: categoriasEventoQueryKey(vars.workspaceId),
      })
    },
  })
}

export function useAtualizarCategoria() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: AtualizarCategoriaPayload) => {
      const { data, error } = await supabase.rpc('rpc_atualizar_categoria', {
        p_categoria_id: payload.categoriaId,
        p_nm_categoria: payload.nmCategoria,
        p_cd_cor:       payload.cdCor,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: categoriasEventoQueryKey(vars.workspaceId),
      })
    },
  })
}

export function useDesativarCategoria() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: DesativarCategoriaPayload) => {
      const { error } = await supabase.rpc('rpc_desativar_categoria', {
        p_categoria_id: payload.categoriaId,
      })
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({
        queryKey: categoriasEventoQueryKey(vars.workspaceId),
      })
    },
  })
}
