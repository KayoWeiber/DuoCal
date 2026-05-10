import { RefreshCw } from 'lucide-react'
import { clearDuocalStorage, versionOutdatedMessage } from '../../lib'
import { Button } from './Button'

type VersionOutdatedModalProps = {
  open: boolean
}

export function VersionOutdatedModal({ open }: VersionOutdatedModalProps) {
  if (!open) {
    return null
  }

  function handleRefresh() {
    clearDuocalStorage()
    window.location.reload()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,20,74,0.38)] px-5 backdrop-blur-sm">
      <section className="duocal-card w-full max-w-sm overflow-y-auto p-6" style={{ maxHeight: 'min(90dvh, 400px)' }}>
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--duocal-text)]">
            Atualize o DuoCal
          </h2>
          <p className="text-sm leading-6 text-[var(--duocal-muted)]">
            {versionOutdatedMessage}
          </p>
        </div>

        <Button
          className="mt-6 w-full"
          icon={<RefreshCw className="size-4" />}
          onClick={handleRefresh}
        >
          Atualizar agora
        </Button>
      </section>
    </div>
  )
}
