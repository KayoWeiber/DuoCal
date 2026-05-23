import { useState } from 'react'
import { Copy, Share2, X } from 'lucide-react'

type Props = {
  codigo: string
  onClose: () => void
}

export function ConnectionCodeSheet({ codigo, onClose }: Props) {
  const [feedback, setFeedback] = useState<string | null>(null)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(codigo)
      setFeedback('Código copiado.')
    } catch {
      setFeedback('Não foi possível copiar.')
    }
  }

  async function handleShare() {
    const shareUrl = `${window.location.origin}/conectar?codigo=${codigo}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'DuoCal',
          text: 'Entre no meu workspace compartilhado no DuoCal usando este código.',
          url: shareUrl,
        })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setFeedback('Link copiado para a área de transferência.')
    } catch {
      setFeedback(shareUrl)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,20,74,0.36)] backdrop-blur-sm">
      <div className="duocal-constrained-width w-full overflow-y-auto rounded-t-[32px] bg-white shadow-[0_-16px_60px_rgba(17,20,74,0.14)]" style={{ maxHeight: 'min(90dvh, 600px)' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-(--duocal-border)" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--duocal-border) px-5 pt-2 pb-4">
          <h3 className="text-lg font-black text-(--duocal-text)">Código de conexão</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-2xl bg-(--duocal-surface-soft) text-(--duocal-muted) transition hover:bg-[rgba(84,102,241,0.08)] hover:text-(--duocal-primary)"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 px-5 py-5">
          {feedback ? (
            <div className="flex items-center justify-between rounded-2xl bg-[rgba(53,207,165,0.10)] px-4 py-3 text-sm font-semibold text-(--duocal-success)">
              <span className="min-w-0 break-all">{feedback}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="ml-3 shrink-0 text-(--duocal-muted)"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : null}

          <p className="text-sm leading-5 text-(--duocal-muted)">
            Compartilhe este código ou link com quem vai dividir o workspace com você.
          </p>

          <div className="rounded-2xl bg-(--duocal-surface-soft) px-5 py-4 text-center">
            <p className="text-4xl font-black tracking-[0.28em] text-(--duocal-primary)">
              {codigo}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-(--duocal-border) bg-white px-4 text-sm font-bold text-(--duocal-text) transition hover:bg-(--duocal-surface-soft)"
            >
              <Copy className="size-4 text-(--duocal-muted)" />
              Copiar código
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white transition"
              style={{ background: 'linear-gradient(135deg, #5466F1 0%, #B66DFF 100%)' }}
            >
              <Share2 className="size-4" />
              Compartilhar
            </button>
          </div>
        </div>

        <div className="pb-[max(1.25rem,env(safe-area-inset-bottom))]" />
      </div>
    </div>
  )
}
