import { useQuery } from '@tanstack/react-query'
import { buildQueryKey, supabase } from '../lib'

export type CategoriaEvento = {
  id: string
  nm_categoria: string
  cd_cor: string
  cd_icone: string | null
  fl_padrao: boolean
}

export function categoriasEventoQueryKey(workspaceId: string) {
  return buildQueryKey('categorias-evento', workspaceId)
}

export function useCategoriasEvento(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: categoriasEventoQueryKey(workspaceId ?? ''),
    enabled: Boolean(workspaceId),
    queryFn: () => listarCategorias(workspaceId!),
    staleTime: 120_000,
  })
}

async function listarCategorias(workspaceId: string): Promise<CategoriaEvento[]> {
  const { data, error } = await supabase.rpc('rpc_listar_categorias_workspace', {
    p_workspace_id: workspaceId,
  })

  if (error) {
    throw error
  }

  if (!data) return []

  return Array.isArray(data) ? (data as CategoriaEvento[]) : [data as CategoriaEvento]
}
