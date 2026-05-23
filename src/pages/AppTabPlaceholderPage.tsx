import { useEffect, type ReactNode } from 'react'
import { CalendarDays, Columns3, LogOut, UserRound } from 'lucide-react'
import {
  BottomNavigation,
  Button,
  EmptyState,
  ScreenContainer,
  type BottomNavigationTab,
} from '../components'
import { useAuthSession, useMeuPerfil, useUnreadNotificationCount } from '../hooks'
import { supabase } from '../lib'

type AppTabPlaceholderPageProps = {
  activeTab: BottomNavigationTab
  description: string
  icon: ReactNode
  title: string
}

export function AppTabPlaceholderPage({
  activeTab,
  description,
  icon,
  title,
}: AppTabPlaceholderPageProps) {
  const { session, isLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const { unreadCount } = useUnreadNotificationCount(perfilQuery.data ?? null)

  useEffect(() => {
    if (!isLoading && !session) {
      window.location.replace('/login')
    }
  }, [isLoading, session])

  return (
    <>
      <ScreenContainer className="justify-center" withBottomNavigation>
        <EmptyState description={description} icon={icon} title={title} />
      </ScreenContainer>
      <BottomNavigation activeTab={activeTab} unreadCount={unreadCount} />
    </>
  )
}

export function AgendaPlaceholderPage() {
  return (
    <AppTabPlaceholderPage
      activeTab="agenda"
      description="A agenda completa será ativada em uma próxima etapa."
      icon={<CalendarDays className="size-5" />}
      title="Agenda"
    />
  )
}

export function KanbanPlaceholderPage() {
  return (
    <AppTabPlaceholderPage
      activeTab="kanban"
      description="O quadro de tarefas será implementado depois do fluxo de workspace."
      icon={<Columns3 className="size-5" />}
      title="Kanban"
    />
  )
}

export function ProfilePlaceholderPage() {
  const { session, isLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil = perfilQuery.data ?? null
  const { unreadCount } = useUnreadNotificationCount(perfil)

  useEffect(() => {
    if (!isLoading && !session) {
      window.location.replace('/login')
    }
  }, [isLoading, session])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  return (
    <>
      <ScreenContainer withBottomNavigation>
        <header className="pb-5">
          <p className="text-sm font-semibold text-(--duocal-muted)">
            Conta
          </p>
          <h1 className="mt-1 text-3xl font-black text-(--duocal-text)">
            Perfil
          </h1>
        </header>

        <section className="duocal-card p-5">
          <div className="flex items-center gap-3">
            <div className="duocal-gradient grid size-12 shrink-0 place-items-center rounded-[20px] text-white shadow-[0_10px_24px_rgba(84,102,241,0.24)]">
              <UserRound className="size-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-(--duocal-text)">
                {perfil?.nm_usuario ?? 'Seu perfil'}
              </h2>
              <p className="truncate text-sm text-(--duocal-muted)">
                {perfil?.ds_email ?? session?.user.email ?? 'DuoCal'}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 duocal-card p-5">
          <h2 className="text-base font-black text-(--duocal-text)">
            Sessão
          </h2>
          <p className="mt-1 text-sm leading-6 text-(--duocal-muted)">
            Gerencie o acesso desta conta no dispositivo atual.
          </p>
          <Button
            className="mt-4 w-full"
            icon={<LogOut className="size-4" />}
            onClick={handleSignOut}
            variant="danger"
          >
            Sair da conta
          </Button>
        </section>
      </ScreenContainer>
      <BottomNavigation activeTab="profile" unreadCount={unreadCount} />
    </>
  )
}
