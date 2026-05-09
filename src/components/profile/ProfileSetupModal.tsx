import { useState, type FormEvent } from 'react'
import { KeyRound, UserRound } from 'lucide-react'
import { getErrorMessage, isVersionOutdatedError } from '../../lib'
import type { MeuPerfil } from '../../hooks'
import { useCompletarPerfilUsuario } from '../../hooks'
import { Button } from '../ui/Button'
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
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/35 px-4 pb-4 backdrop-blur-sm sm:items-center">
        <section className="w-full max-w-[430px] rounded-[30px] bg-white p-5 shadow-2xl shadow-slate-950/20">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-950">
              <UserRound className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Complete seu perfil
              </h2>
              <p className="text-sm text-slate-500">{perfil.ds_email}</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              autoComplete="name"
              label="Nome de exibição"
              minLength={2}
              onChange={(event) => setNmUsuario(event.target.value)}
              placeholder="Como voce quer aparecer?"
              required
              value={nmUsuario}
            />

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <KeyRound className="size-4" />
                Token de conexao
              </div>
              <p className="mt-2 text-3xl font-black tracking-[0.22em] text-slate-950">
                {perfil.cd_token_conexao}
              </p>
              <p className="mt-2 text-sm leading-5 text-slate-500">
                Este codigo conecta outra pessoa ao seu workspace compartilhado.
              </p>
            </div>

            {errorMessage ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </p>
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
