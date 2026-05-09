import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, UserPlus } from 'lucide-react'
import { Button, Input, ScreenContainer, VersionOutdatedModal } from '../components'
import { getErrorMessage, isVersionOutdatedError, supabase } from '../lib'
import { useAuthSession } from '../hooks'

type AuthMode = 'login' | 'signup'

export function LoginPage() {
  const { session, isLoading } = useAuthSession()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [versionOutdated, setVersionOutdated] = useState(false)
  const appVersion = import.meta.env.VITE_APP_VERSION

  useEffect(() => {
    if (!isLoading && session) {
      window.location.replace('/')
    }
  }, [isLoading, session])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setErrorMessage('Informe seu e-mail.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

        if (error) {
          throw error
        }

        await registrarLoginSemBloquear()
        window.location.replace('/')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      })

      if (error) {
        throw error
      }

      if (data.session) {
        await registrarLoginSemBloquear()
        window.location.replace('/')
        return
      }

      setSuccessMessage(
        'Conta criada. Confirme seu e-mail para entrar no DuoCal.',
      )
      setMode('login')
    } catch (error) {
      if (isVersionOutdatedError(error)) {
        setVersionOutdated(true)
        return
      }

      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <ScreenContainer className="justify-center">
        <section className="duocal-card p-6">
          <div className="mb-8 text-center">
            <img
              src="/duocal-logo.svg"
              alt="DuoCal"
              className="mx-auto h-16 w-auto"
            />
            <h1 className="mt-4 text-3xl font-black text-[var(--duocal-text)]">
              DuoCal
            </h1>
            <p className="mt-2 text-sm text-[var(--duocal-muted)]">
              Sincronia é a base de tudo.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-[18px] bg-[var(--duocal-surface-soft)] p-1">
            <button
              className={modeButtonClass(mode === 'login')}
              onClick={() => setMode('login')}
              type="button"
            >
              Entrar
            </button>
            <button
              className={modeButtonClass(mode === 'signup')}
              onClick={() => setMode('signup')}
              type="button"
            >
              Criar conta
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              autoComplete="email"
              inputMode="email"
              label="E-mail"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@email.com"
              required
              type="email"
              value={email}
            />
            <div className="space-y-2">
              <span className="text-sm font-medium text-[var(--duocal-text)]">
                Senha
              </span>
              <div className="relative">
                <input
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  className="duocal-input pr-12 text-base"
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--duocal-muted)] transition hover:bg-white hover:text-[var(--duocal-primary)]"
                  onClick={() => setShowPassword((value) => !value)}
                  type="button"
                >
                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}
                </button>
              </div>
            </div>

            {errorMessage ? (
              <p className="rounded-2xl bg-[rgba(255,90,122,0.10)] px-4 py-3 text-sm text-[var(--duocal-danger)]">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-2xl bg-[rgba(53,207,165,0.12)] px-4 py-3 text-sm text-[#159A7D]">
                {successMessage}
              </p>
            ) : null}

            <Button
              className="w-full"
              icon={
                mode === 'login' ? (
                  <ArrowRight className="size-4" />
                ) : (
                  <UserPlus className="size-4" />
                )
              }
              isLoading={isSubmitting}
              type="submit"
            >
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>

            <p className="text-center text-xs font-medium text-slate-400">
              Versão {appVersion}
            </p>
          </form>
        </section>
      </ScreenContainer>

      <VersionOutdatedModal open={versionOutdated} />
    </>
  )
}

function modeButtonClass(active: boolean) {
  return [
    'h-10 rounded-[14px] text-sm font-bold transition',
    active
      ? 'duocal-gradient text-white shadow-[0_8px_20px_rgba(84,102,241,0.24)]'
      : 'text-[var(--duocal-muted)]',
  ].join(' ')
}

async function registrarLoginSemBloquear() {
  const { error } = await supabase.rpc('rpc_registrar_login_usuario')

  if (error && !getErrorMessage(error).includes('PERFIL_NAO_ENCONTRADO')) {
    throw error
  }
}
