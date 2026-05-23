import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '../../utils'

type FeedbackAlertVariant = 'error' | 'success' | 'info'

type FeedbackAlertProps = {
  className?: string
  message: string
  onClose?: () => void
  title?: string
  variant?: FeedbackAlertVariant
}

const variantStyles = {
  error: {
    bar: 'bg-(--duocal-danger)',
    border: 'border-[rgba(255,90,122,0.22)]',
    icon: 'bg-[rgba(255,90,122,0.12)] text-(--duocal-danger)',
    iconNode: AlertCircle,
    role: 'alert',
    title: 'Não foi possível continuar',
  },
  info: {
    bar: 'duocal-gradient',
    border: 'border-[rgba(84,102,241,0.18)]',
    icon: 'bg-[rgba(84,102,241,0.10)] text-(--duocal-primary)',
    iconNode: Info,
    role: 'status',
    title: 'Aviso',
  },
  success: {
    bar: 'bg-(--duocal-success)',
    border: 'border-[rgba(53,207,165,0.22)]',
    icon: 'bg-[rgba(53,207,165,0.13)] text-[#159A7D]',
    iconNode: CheckCircle2,
    role: 'status',
    title: 'Tudo certo',
  },
} satisfies Record<
  FeedbackAlertVariant,
  {
    bar: string
    border: string
    icon: string
    iconNode: typeof AlertCircle
    role: 'alert' | 'status'
    title: string
  }
>

export function FeedbackAlert({
  className,
  message,
  onClose,
  title,
  variant = 'info',
}: FeedbackAlertProps) {
  const styles = variantStyles[variant]
  const Icon = styles.iconNode

  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl border bg-white shadow-[0_14px_34px_rgba(17,20,74,0.08)]',
        styles.border,
        className,
      )}
      role={styles.role}
    >
      <div className={cn('h-1 w-full', styles.bar)} />
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-2xl',
            styles.icon,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-5 text-(--duocal-text)">
            {title ?? styles.title}
          </p>
          <p className="mt-0.5 text-sm leading-5 text-(--duocal-muted)">
            {message}
          </p>
        </div>
        {onClose ? (
          <button
            aria-label="Fechar aviso"
            className="grid size-8 shrink-0 place-items-center rounded-full text-(--duocal-muted) transition hover:bg-(--duocal-surface-soft) hover:text-(--duocal-text)"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
