import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buildQueryKey, supabase } from '../lib'

export type PushNotificationPreferences = {
  flAlteracoesAgenda: boolean
  flConvites: boolean
  flEventos: boolean
  flLembretes: boolean
  nrMinutosAntesEvento: number
}

export type PushSubscriptionStatus = PushNotificationPreferences & {
  dtUltimoUso: string | null
  flAtivo: boolean
  pushSubscriptionId: string
}

type PushSubscriptionStatusRow = {
  push_subscription_id: string
  fl_ativo: boolean
  dt_ultimo_uso: string | null
  fl_eventos: boolean
  fl_lembretes: boolean
  fl_convites: boolean
  fl_alteracoes_agenda: boolean
  nr_minutos_antes_evento: number
}

export type SalvarPushSubscriptionPayload = {
  deviceLabel?: string
  subscription: PushSubscription
  workspaceId: string
}

export type DesativarPushSubscriptionPayload = {
  endpoint: string
  workspaceId: string
}

export type AtualizarPreferenciasPushPayload = PushNotificationPreferences & {
  pushSubscriptionId: string
  workspaceId: string
}

export function pushSubscriptionStatusQueryKey(
  workspaceId: string,
  endpoint: string | null | undefined,
) {
  return buildQueryKey('push-subscription-status', workspaceId, endpoint ?? '')
}

export function usePushSubscriptionStatus(
  workspaceId: string | null | undefined,
  endpoint: string | null | undefined,
) {
  return useQuery({
    queryKey: pushSubscriptionStatusQueryKey(workspaceId ?? '', endpoint),
    enabled: Boolean(workspaceId && endpoint),
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        'rpc_obter_status_push_dispositivo',
        {
          p_workspace_id: workspaceId,
          p_endpoint: endpoint,
        },
      )

      if (error) {
        throw error
      }

      return mapPushStatus(normalizeRpcRow<PushSubscriptionStatusRow>(data))
    },
    staleTime: 15_000,
  })
}

export function useSalvarPushSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: salvarPushSubscription,
    onSuccess: (status, payload) => {
      queryClient.setQueryData(
        pushSubscriptionStatusQueryKey(
          payload.workspaceId,
          payload.subscription.endpoint,
        ),
        status,
      )
      queryClient.invalidateQueries({
        queryKey: buildQueryKey('push-subscription-status', payload.workspaceId),
      })
    },
  })
}

export function useDesativarPushSubscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: DesativarPushSubscriptionPayload) => {
      const { error } = await supabase.rpc('rpc_desativar_push_subscription', {
        p_workspace_id: payload.workspaceId,
        p_endpoint: payload.endpoint,
      })

      if (error) {
        throw error
      }
    },
    onSuccess: (_result, payload) => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey('push-subscription-status', payload.workspaceId),
      })
    },
  })
}

export function useAtualizarPreferenciasPush() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: AtualizarPreferenciasPushPayload) => {
      const { data, error } = await supabase.rpc(
        'rpc_atualizar_preferencia_notificacao_push',
        {
          p_workspace_id: payload.workspaceId,
          p_push_subscription_id: payload.pushSubscriptionId,
          p_fl_eventos: payload.flEventos,
          p_fl_lembretes: payload.flLembretes,
          p_fl_convites: payload.flConvites,
          p_fl_alteracoes_agenda: payload.flAlteracoesAgenda,
          p_nr_minutos_antes_evento: payload.nrMinutosAntesEvento,
        },
      )

      if (error) {
        throw error
      }

      return mapPushStatus(normalizeRpcRow<PushSubscriptionStatusRow>(data))
    },
    onSuccess: (_status, payload) => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey('push-subscription-status', payload.workspaceId),
      })
    },
  })
}

async function salvarPushSubscription(payload: SalvarPushSubscriptionPayload) {
  const subscriptionJson = payload.subscription.toJSON()
  const endpoint = subscriptionJson.endpoint
  const p256dh = subscriptionJson.keys?.p256dh
  const auth = subscriptionJson.keys?.auth

  if (!endpoint || !p256dh || !auth) {
    throw new Error('Subscription push incompleta.')
  }

  const { data, error } = await supabase.rpc('rpc_salvar_push_subscription', {
    p_workspace_id: payload.workspaceId,
    p_endpoint: endpoint,
    p_p256dh: p256dh,
    p_auth: auth,
    p_ds_dispositivo: payload.deviceLabel ?? buildDeviceLabel(),
    p_ds_user_agent: navigator.userAgent,
    p_ds_platform: navigator.platform,
  })

  if (error) {
    throw error
  }

  return mapPushStatus(normalizeRpcRow<PushSubscriptionStatusRow>(data))
}

function mapPushStatus(
  row: PushSubscriptionStatusRow | null,
): PushSubscriptionStatus | null {
  if (!row) {
    return null
  }

  return {
    dtUltimoUso: row.dt_ultimo_uso,
    flAlteracoesAgenda: row.fl_alteracoes_agenda,
    flAtivo: row.fl_ativo,
    flConvites: row.fl_convites,
    flEventos: row.fl_eventos,
    flLembretes: row.fl_lembretes,
    nrMinutosAntesEvento: row.nr_minutos_antes_evento,
    pushSubscriptionId: row.push_subscription_id,
  }
}

function normalizeRpcRow<T>(data: unknown) {
  if (Array.isArray(data)) {
    return (data[0] ?? null) as T | null
  }

  return data as T | null
}

function buildDeviceLabel() {
  if (/iphone/i.test(navigator.userAgent)) {
    return 'iPhone PWA'
  }

  if (/ipad/i.test(navigator.userAgent)) {
    return 'iPad PWA'
  }

  if (/android/i.test(navigator.userAgent)) {
    return 'Android'
  }

  return navigator.platform || 'Navegador'
}
