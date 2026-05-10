import {
  Bell,
  CalendarDays,
  Columns3,
  Home,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { cn } from '../../utils'

export type BottomNavigationTab =
  | 'home'
  | 'agenda'
  | 'kanban'
  | 'notifications'
  | 'profile'

type BottomNavigationProps = {
  activeTab: BottomNavigationTab
  unreadCount?: number
}

type NavigationItem = {
  href: '/' | '/agenda' | '/kanban' | '/notificacoes' | '/perfil'
  icon: LucideIcon
  id: BottomNavigationTab
  label: string
}

const navigationItems: NavigationItem[] = [
  { href: '/', icon: Home, id: 'home', label: 'Início' },
  { href: '/agenda', icon: CalendarDays, id: 'agenda', label: 'Agenda' },
  { href: '/kanban', icon: Columns3, id: 'kanban', label: 'Kanban' },
  {
    href: '/notificacoes',
    icon: Bell,
    id: 'notifications',
    label: 'Notificações',
  },
  { href: '/perfil', icon: UserRound, id: 'profile', label: 'Perfil' },
]

export function BottomNavigation({
  activeTab,
  unreadCount = 0,
}: BottomNavigationProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-[rgba(229,231,240,0.88)] bg-white/86 px-3 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_34px_rgba(17,20,74,0.08)] backdrop-blur-xl"
    >
      <div className="grid grid-cols-5 gap-1">
        {navigationItems.map((item) => (
          <BottomNavigationLink
            active={item.id === activeTab}
            count={item.id === 'notifications' ? unreadCount : 0}
            href={item.href}
            icon={item.icon}
            key={item.id}
            label={item.label}
          />
        ))}
      </div>
    </nav>
  )
}

function BottomNavigationLink({
  active,
  count,
  href,
  icon: Icon,
  label,
}: {
  active: boolean
  count: number
  href: '/' | '/agenda' | '/kanban' | '/notificacoes' | '/perfil'
  icon: LucideIcon
  label: string
}) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[18px] text-[11px] font-semibold transition',
        active
          ? 'bg-[rgba(84,102,241,0.10)] text-[var(--duocal-primary)]'
          : 'text-[rgba(107,114,128,0.82)] hover:bg-[rgba(84,102,241,0.06)] hover:text-[var(--duocal-primary)]',
      )}
      to={href}
    >
      <span className="relative grid size-6 place-items-center">
        <Icon className="size-[19px]" strokeWidth={active ? 2.4 : 1.9} />
        {count > 0 ? <NotificationBadge count={count} /> : null}
      </span>
      <span className="leading-none">{label}</span>
    </Link>
  )
}

function NotificationBadge({ count }: { count: number }) {
  const label = count > 9 ? '9+' : String(count)

  return (
    <span className="absolute -right-2 -top-2 grid min-w-4 place-items-center rounded-full bg-[var(--duocal-danger)] px-1 text-[10px] font-black leading-4 text-white ring-2 ring-white">
      {label}
    </span>
  )
}
