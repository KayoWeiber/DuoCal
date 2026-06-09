import { useEffect, useRef, useState } from 'react'
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
  { href: '/', icon: Home, id: 'home', label: 'In\u00edcio' },
  { href: '/agenda', icon: CalendarDays, id: 'agenda', label: 'Agenda' },
  { href: '/kanban', icon: Columns3, id: 'kanban', label: 'Kanban' },
  {
    href: '/notificacoes',
    icon: Bell,
    id: 'notifications',
    label: 'Notifica\u00e7\u00f5es',
  },
  { href: '/perfil', icon: UserRound, id: 'profile', label: 'Perfil' },
]

function getScrollTop(event?: Event) {
  const target = event?.target

  if (target instanceof HTMLElement) {
    return target.scrollTop
  }

  if (target instanceof Document) {
    return window.scrollY || document.documentElement.scrollTop
  }

  return window.scrollY || document.documentElement.scrollTop
}

export function BottomNavigation({
  activeTab,
  unreadCount = 0,
}: BottomNavigationProps) {
  const [compact, setCompact] = useState(false)
  const lastScrollTopRef = useRef(0)
  const tickingRef = useRef(false)

  useEffect(() => {
    function handleScroll(event: Event) {
      if (tickingRef.current) return

      tickingRef.current = true
      window.requestAnimationFrame(() => {
        const currentScrollTop = Math.max(getScrollTop(event), 0)
        const delta = currentScrollTop - lastScrollTopRef.current

        if (currentScrollTop < 16) {
          setCompact(false)
        } else if (delta > 8) {
          setCompact(true)
        } else if (delta < -8) {
          setCompact(false)
        }

        lastScrollTopRef.current = currentScrollTop
        tickingRef.current = false
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, {
      capture: true,
      passive: true,
    })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll, { capture: true })
    }
  }, [])

  return (
    <nav
      aria-label="Navega\u00e7\u00e3o principal"
      className={cn(
        'duocal-constrained-width pointer-events-none fixed inset-x-0 z-30 mx-auto flex w-full justify-center px-4 transition-[bottom] duration-300 ease-out',
        compact
          ? 'bottom-[calc(0.55rem+env(safe-area-inset-bottom,0px))]'
          : 'bottom-[calc(0.9rem+env(safe-area-inset-bottom,0px))]',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto grid w-full grid-cols-5 items-center rounded-full border border-white/70 bg-white/74 shadow-[0_18px_46px_rgba(17,20,74,0.16)] backdrop-blur-2xl ring-1 ring-[rgba(84,102,241,0.10)] transition-all duration-300 ease-out',
          compact ? 'max-w-[330px] gap-0.5 p-1' : 'max-w-[390px] gap-1 p-1.5',
        )}
      >
        {navigationItems.map((item) => (
          <BottomNavigationLink
            active={item.id === activeTab}
            compact={compact}
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
  compact,
  count,
  href,
  icon: Icon,
  label,
}: {
  active: boolean
  compact: boolean
  count: number
  href: '/' | '/agenda' | '/kanban' | '/notificacoes' | '/perfil'
  icon: LucideIcon
  label: string
}) {
  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center justify-center rounded-full transition-all duration-300 active:scale-[0.94]',
        compact ? 'min-h-10' : 'min-h-12',
        active
          ? 'bg-[linear-gradient(135deg,#5466F1,#B66DFF)] text-white shadow-[0_10px_24px_rgba(84,102,241,0.28)]'
          : 'text-[rgba(17,20,74,0.58)] hover:bg-[rgba(84,102,241,0.08)] hover:text-(--duocal-primary)',
      )}
      title={label}
      to={href}
    >
      <span
        className={cn(
          'relative grid place-items-center transition-all duration-300',
          compact ? 'size-8' : 'size-9',
        )}
      >
        <Icon
          className={cn(
            'transition-all duration-300 group-hover:scale-105',
            compact ? 'size-5' : 'size-[22px]',
          )}
          fill={active ? 'rgba(255,255,255,0.22)' : 'none'}
          strokeWidth={active ? 2.6 : 2.2}
        />
        {count > 0 ? <NotificationBadge count={count} /> : null}
      </span>
      <span className="sr-only">{label}</span>
    </Link>
  )
}

function NotificationBadge({ count }: { count: number }) {
  const label = count > 9 ? '9+' : String(count)

  return (
    <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-(--duocal-danger) px-1 text-[10px] font-black leading-4 text-white ring-2 ring-white">
      {label}
    </span>
  )
}
