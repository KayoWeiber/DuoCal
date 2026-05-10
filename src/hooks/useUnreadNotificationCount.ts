import type { MeuPerfil } from './useMeuPerfil'
import {
  useNotificacoesSolicitacaoWorkspace,
  useSolicitacoesWorkspacePendentes,
} from './useWorkspaceAtual'

export function useUnreadNotificationCount(
  perfil: MeuPerfil | null | undefined,
) {
  const enabled = Boolean(perfil?.id && perfil.fl_perfil_completo)
  const solicitacoesQuery = useSolicitacoesWorkspacePendentes(enabled)
  const notificacoesQuery = useNotificacoesSolicitacaoWorkspace(enabled)

  return {
    isLoading: solicitacoesQuery.isLoading || notificacoesQuery.isLoading,
    unreadCount: Math.max(
      solicitacoesQuery.data?.length ?? 0,
      notificacoesQuery.data?.length ?? 0,
    ),
  }
}
