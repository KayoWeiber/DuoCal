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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-5 backdrop-blur-sm">
      <section className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl shadow-slate-950/20">
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-slate-950">Atualize o DuoCal</h2>
          <p className="text-sm leading-6 text-slate-600">
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
