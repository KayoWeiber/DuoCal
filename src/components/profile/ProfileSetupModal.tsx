import { useState, type FormEvent } from 'react'
import { KeyRound, UserRound } from 'lucide-react'
import { getErrorMessage, isVersionOutdatedError } from '../../lib'
import type { MeuPerfil } from '../../hooks'
import { useCompletarPerfilUsuario } from '../../hooks'
import { Button } from '../ui/Button'
import { FeedbackAlert } from '../ui/FeedbackAlert'
import { Input } from '../ui/Input'
import { VersionOutdatedModal } from '../ui/VersionOutdatedModal'

type ProfileSetupModalProps = {
  perfil: MeuPerfil
}

export function ProfileSetupModal({ perfil }: ProfileSetupModalProps) {
  const [nmUsuario, setNmUsuario] = useState(perfil.nm_usuario ?? '')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [versionOutdated, setVersionOutdated] = useState(false)
  const completarPerfil = useCompletarPerfilUsuario()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    try {
      await completarPerfil.mutateAsync({
        nmUsuario,
      })
    } catch (error) {
      if (isVersionOutdatedError(error)) {
        setVersionOutdated(true)
        return
      }

      setErrorMessage(getErrorMessage(error))
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(17,20,74,0.32)] px-4 pb-4 backdrop-blur-sm sm:items-center">
        <section className="duocal-card duocal-constrained-width w-full overflow-y-auto p-5" style={{ maxHeight: 'min(90dvh, 640px)' }}>
          <div className="mb-5 flex items-center gap-3">
            <div className="duocal-gradient flex size-11 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_rgba(84,102,241,0.24)]">
              <UserRound className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--duocal-text)]">
                Complete seu perfil
              </h2>
              <p className="text-sm text-[var(--duocal-muted)]">
                {perfil.ds_email}
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              autoComplete="name"
              label="Nome de exibição"
              minLength={2}
              onChange={(event) => setNmUsuario(event.target.value)}
              placeholder="Como você quer aparecer?"
              required
              value={nmUsuario}
            />

            <div className="rounded-3xl border border-[var(--duocal-border)] bg-[var(--duocal-surface-soft)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--duocal-text)]">
                <KeyRound className="size-4" />
                Código de conexão
              </div>
              <p className="mt-2 text-3xl font-black tracking-[0.22em] text-[var(--duocal-primary)]">
                {perfil.cd_codigo_conexao}
              </p>
              <p className="mt-2 text-sm leading-5 text-[var(--duocal-muted)]">
                Este código permite que outra pessoa solicite conexão ao seu
                workspace compartilhado.
              </p>
            </div>

            {errorMessage ? (
              <FeedbackAlert
                message={errorMessage}
                onClose={() => setErrorMessage(null)}
                title="Não foi possível salvar"
                variant="error"
              />
            ) : null}

            <Button
              className="w-full"
              isLoading={completarPerfil.isPending}
              type="submit"
            >
              Salvar e continuar
            </Button>
          </form>
        </section>
      </div>

      <VersionOutdatedModal open={versionOutdated} />
    </>
  )
}
