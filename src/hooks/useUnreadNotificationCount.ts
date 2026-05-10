import type { MeuPerfil } from './useMeuPerfil'
import { useMinhasNotificacoes } from './useWorkspaceAtual'

export function useUnreadNotificationCount(
  perfil: MeuPerfil | null | undefined,
) {
  const enabled = Boolean(perfil?.id && perfil.fl_perfil_completo)
  const notificacoesQuery = useMinhasNotificacoes(enabled)

  return {
    isLoading: notificacoesQuery.isLoading,
    unreadCount:
      notificacoesQuery.data?.filter((notificacao) => !notificacao.fl_lida)
        .length ?? 0,
  }
}
