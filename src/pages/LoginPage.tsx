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
      <ScreenContainer className="justify-center bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2FF_100%)]">
        <section className="rounded-[32px] border border-white/80 bg-white/92 p-6 shadow-xl shadow-slate-200/80 backdrop-blur">
          <div className="mb-8 text-center">
            <img src="/duocal-logo.svg" alt="DuoCal" className="mx-auto h-16 w-auto" />
            <h1 className="mt-4 text-3xl font-black text-slate-950">DuoCal</h1>
            <p className="mt-2 text-sm text-slate-500">
              Sincronia é a base de tudo.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
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
              <span className="text-sm font-medium text-slate-700">Senha</span>
              <div className="relative">
                <input
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-12 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-200/70"
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimo de 6 caracteres"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />
                <button
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
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
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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
              V{appVersion}
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
    'h-10 rounded-xl text-sm font-semibold transition',
    active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500',
  ].join(' ')
}

async function registrarLoginSemBloquear() {
  const { error } = await supabase.rpc('rpc_registrar_login_usuario')

  if (error && !getErrorMessage(error).includes('PERFIL_NAO_ENCONTRADO')) {
    throw error
  }
}
