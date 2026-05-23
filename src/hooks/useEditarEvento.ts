import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appVersion, supabase } from '../lib'
import type { AtualizarEventoPayload, EventoWorkspace } from './useEventosWorkspace'

// ─── Buscar evento (para pré-preencher formulário de edição) ─────────────────

export function buscarEventoQueryKey(eventoId: string, workspaceId: string) {
  return ['duocal', appVersion, 'evento', eventoId, workspaceId] as const
}

export function useBuscarEvento(
  eventoId: string | null | undefined,
  workspaceId: string | null | undefined,
) {
  return useQuery({
    queryKey: buscarEventoQueryKey(eventoId ?? '', workspaceId ?? ''),
    enabled: Boolean(eventoId && workspaceId),
    staleTime: 0,
    networkMode: 'offlineFirst',
    queryFn: async () => {
      const { data, error } = await supabase.rpc('rpc_buscar_evento', {
        p_evento_id:    eventoId!,
        p_workspace_id: workspaceId!,
      })

      if (error) throw error
      if (!data) throw new Error('Evento não encontrado.')

      const raw = data as Record<string, unknown>
      return {
        ...raw,
        participantes: Array.isArray(raw.participantes)
          ? raw.participantes
          : raw.participantes
            ? [raw.participantes]
            : [],
      } as EventoWorkspace
    },
  })
}

// ─── Atualizar evento ────────────────────────────────────────────────────────

export function useEditarEvento() {
  const queryClient = useQueryClient()

  return useMutation<unknown, Error, AtualizarEventoPayload>({
    mutationFn: async (payload) => {
      const { data, error } = await supabase.rpc('rpc_atualizar_evento', {
        p_evento_id:           payload.eventoId,
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
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['duocal', appVersion, 'eventos-workspace', variables.workspaceId],
        exact: false,
        refetchType: 'all',
      })
      queryClient.invalidateQueries({
        queryKey: buscarEventoQueryKey(variables.eventoId, variables.workspaceId),
      })
    },
  })
}
