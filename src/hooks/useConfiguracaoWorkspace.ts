import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { buildQueryKey, supabase } from '../lib'
import { workspaceAtualQueryKey } from './useWorkspaceAtual'

export type ConfiguracaoWorkspace = {
  workspaceId: string
  nmWorkspace: string
  dsSlogan: string
  tpWorkspace: string
  hrInicioDia: string
  hrFimDia: string
  flNotificacaoInterna: boolean
  flPushHabilitado: boolean
  flKanbanHabilitado: boolean
  flAgendaHabilitada: boolean
  nmIdioma: string
  nmTimezone: string
}

export type AtualizarConfiguracaoWorkspacePayload = {
  workspaceId: string
  nmWorkspace: string
  dsSlogan: string
  hrInicioDia: string
  hrFimDia: string
  flNotificacaoInterna: boolean
  flKanbanHabilitado: boolean
  flAgendaHabilitada: boolean
  nmTimezone: string
}

type WorkspaceRow = {
  id: string
  nm_workspace: string
  ds_slogan: string | null
  tp_workspace: string
}

type ConfigRow = {
  workspace_id: string
  hr_inicio_dia: string | null
  hr_fim_dia: string | null
  fl_notificacao_interna: boolean | null
  fl_push_habilitado: boolean | null
  fl_kanban_habilitado: boolean | null
  fl_agenda_habilitada: boolean | null
  nm_idioma: string | null
  nm_timezone: string | null
}

export function configuracaoWorkspaceQueryKey(workspaceId: string) {
  return buildQueryKey('configuracao-workspace', workspaceId)
}

export function useConfiguracaoWorkspace(workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: configuracaoWorkspaceQueryKey(workspaceId ?? ''),
    enabled: Boolean(workspaceId),
    staleTime: 30_000,
    queryFn: () => obterConfiguracaoWorkspace(workspaceId!),
  })
}

export function useAtualizarConfiguracaoWorkspace() {
  const queryClient = useQueryClient()

  return useMutation<ConfiguracaoWorkspace, Error, AtualizarConfiguracaoWorkspacePayload>({
    mutationFn: atualizarConfiguracaoWorkspace,
    onSuccess: (configuracao) => {
      queryClient.invalidateQueries({
        queryKey: configuracaoWorkspaceQueryKey(configuracao.workspaceId),
      })
      queryClient.invalidateQueries({ queryKey: workspaceAtualQueryKey })
    },
  })
}

async function obterConfiguracaoWorkspace(
  workspaceId: string,
): Promise<ConfiguracaoWorkspace> {
  const [workspaceResponse, configResponse] = await Promise.all([
    supabase
      .from('dim_workspace')
      .select('id,nm_workspace,ds_slogan,tp_workspace')
      .eq('id', workspaceId)
      .maybeSingle(),
    supabase
      .from('cfg_workspace')
      .select(
        [
          'workspace_id',
          'hr_inicio_dia',
          'hr_fim_dia',
          'fl_notificacao_interna',
          'fl_push_habilitado',
          'fl_kanban_habilitado',
          'fl_agenda_habilitada',
          'nm_idioma',
          'nm_timezone',
        ].join(','),
      )
      .eq('workspace_id', workspaceId)
      .maybeSingle(),
  ])

  if (workspaceResponse.error) {
    throw workspaceResponse.error
  }

  if (configResponse.error) {
    throw configResponse.error
  }

  if (!workspaceResponse.data) {
    throw new Error('Workspace não encontrado.')
  }

  return mapConfiguracao(
    workspaceResponse.data as WorkspaceRow,
    (configResponse.data ?? null) as ConfigRow | null,
  )
}

async function atualizarConfiguracaoWorkspace(
  payload: AtualizarConfiguracaoWorkspacePayload,
): Promise<ConfiguracaoWorkspace> {
  const nmWorkspace = payload.nmWorkspace.trim()
  const dsSlogan = payload.dsSlogan.trim()

  if (!nmWorkspace) {
    throw new Error('Informe o nome do workspace.')
  }

  const workspaceResponse = await supabase
    .from('dim_workspace')
    .update({
      nm_workspace: nmWorkspace,
      ds_slogan: dsSlogan || 'Sincronia é a base de tudo',
    })
    .eq('id', payload.workspaceId)
    .select('id,nm_workspace,ds_slogan,tp_workspace')
    .single()

  if (workspaceResponse.error) {
    throw workspaceResponse.error
  }

  const configResponse = await supabase
    .from('cfg_workspace')
    .upsert(
      {
        workspace_id: payload.workspaceId,
        hr_inicio_dia: payload.hrInicioDia,
        hr_fim_dia: payload.hrFimDia,
        fl_notificacao_interna: payload.flNotificacaoInterna,
        fl_kanban_habilitado: payload.flKanbanHabilitado,
        fl_agenda_habilitada: payload.flAgendaHabilitada,
        nm_timezone: payload.nmTimezone,
      },
      { onConflict: 'workspace_id' },
    )
    .select(
      [
        'workspace_id',
        'hr_inicio_dia',
        'hr_fim_dia',
        'fl_notificacao_interna',
        'fl_push_habilitado',
        'fl_kanban_habilitado',
        'fl_agenda_habilitada',
        'nm_idioma',
        'nm_timezone',
      ].join(','),
    )
    .single()

  if (configResponse.error) {
    throw configResponse.error
  }

  return mapConfiguracao(
    workspaceResponse.data as WorkspaceRow,
    configResponse.data as unknown as ConfigRow,
  )
}

function mapConfiguracao(
  workspace: WorkspaceRow,
  config: ConfigRow | null,
): ConfiguracaoWorkspace {
  return {
    workspaceId: workspace.id,
    nmWorkspace: workspace.nm_workspace,
    dsSlogan: workspace.ds_slogan ?? '',
    tpWorkspace: workspace.tp_workspace,
    hrInicioDia: normalizeTime(config?.hr_inicio_dia, '06:00'),
    hrFimDia: normalizeTime(config?.hr_fim_dia, '23:00'),
    flNotificacaoInterna: config?.fl_notificacao_interna ?? true,
    flPushHabilitado: config?.fl_push_habilitado ?? false,
    flKanbanHabilitado: config?.fl_kanban_habilitado ?? true,
    flAgendaHabilitada: config?.fl_agenda_habilitada ?? true,
    nmIdioma: config?.nm_idioma ?? 'pt-BR',
    nmTimezone: config?.nm_timezone ?? 'America/Sao_Paulo',
  }
}

function normalizeTime(value: string | null | undefined, fallback: string) {
  if (!value) return fallback
  return value.slice(0, 5)
}
