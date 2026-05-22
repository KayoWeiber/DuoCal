import type { SyncState } from '../../hooks/useSyncQueue'

type OfflineBarProps = {
  isOnline: boolean
  syncState: SyncState
  pendingCount: number
}

export function OfflineBar({ isOnline, syncState, pendingCount }: OfflineBarProps) {
  if (isOnline && syncState === 'idle' && pendingCount === 0) return null

  let bg = '#374151'
  let text = 'Sem conexão'

  if (!isOnline) {
    bg = '#374151'
    text =
      pendingCount > 0
        ? `Offline · ${pendingCount} evento${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''}`
        : 'Sem conexão'
  } else if (syncState === 'syncing') {
    bg = '#5466F1'
    text = 'Sincronizando eventos...'
  } else if (syncState === 'done') {
    bg = '#16a34a'
    text = 'Eventos sincronizados'
  } else if (syncState === 'error') {
    bg = '#dc2626'
    text = 'Erro ao sincronizar. Tentaremos novamente.'
  } else if (isOnline && pendingCount > 0) {
    bg = '#92400e'
    text = `${pendingCount} evento${pendingCount > 1 ? 's' : ''} aguardando envio`
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white"
      style={{ backgroundColor: bg }}
    >
      {syncState === 'syncing' && (
        <span className="inline-flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1 rounded-full bg-white animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      )}
      <span>{text}</span>
    </div>
  )
}
