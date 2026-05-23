import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import {
  Button,
  FeedbackAlert,
  Input,
  ScreenContainer,
  VersionOutdatedModal,
} from '../components'
import {
  errorContains,
  getErrorMessage,
  isVersionOutdatedError,
  supabase,
} from '../lib'
import { useAuthSession } from '../hooks'

export function LoginPage() {
  const { session, isLoading } = useAuthSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [signupUnavailableOpen, setSignupUnavailableOpen] = useState(false)
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
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (error) {
        throw error
      }

      await registrarLoginSemBloquear()
      window.location.replace('/')
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
            <h1 className="mt-4 text-3xl font-black text-(--duocal-text)">
              DuoCal
            </h1>
            <p className="mt-2 text-sm text-(--duocal-muted)">
              Sincronia é a base de tudo.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-[18px] bg-(--duocal-surface-soft) p-1">
            <button
              className={modeButtonClass(true)}
              type="button"
            >
              Entrar
            </button>
            <button
              className={modeButtonClass(false)}
              onClick={() => {
                setErrorMessage(null)
                setSignupUnavailableOpen(true)
              }}
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
              <span className="text-sm font-medium text-(--duocal-text)">
                Senha
              </span>
              <div className="relative">
                <input
                  autoComplete="current-password"
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
                  className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-(--duocal-muted) transition hover:bg-white hover:text-(--duocal-primary)"
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
              <FeedbackAlert
                message={errorMessage}
                onClose={() => setErrorMessage(null)}
                title="Não foi possível entrar"
                variant="error"
              />
            ) : null}

            <Button
              className="w-full"
              icon={<ArrowRight className="size-4" />}
              isLoading={isSubmitting}
              type="submit"
            >
              Entrar
            </Button>

            <p className="text-center text-xs font-medium text-slate-400">
              Versão {appVersion}
            </p>
          </form>
        </section>
      </ScreenContainer>

      {signupUnavailableOpen ? (
        <div
          aria-labelledby="signup-unavailable-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,20,74,0.28)] px-5 backdrop-blur-sm"
          role="dialog"
        >
          <div className="duocal-card w-full max-w-sm overflow-y-auto p-6 text-center" style={{ maxHeight: 'min(90dvh, 480px)' }}>
            <h2
              className="text-xl font-black text-(--duocal-text)"
              id="signup-unavailable-title"
            >
              Cadastro indisponível
            </h2>
            <p className="mt-3 text-sm leading-6 text-(--duocal-muted)">
              A criação de conta ainda não está disponível nesta versão do
              DuoCal. Caso precise de acesso, entre em contato com Kayo Weiber
              pelo e-mail{' '}
              <a
                className="font-bold text-(--duocal-primary)"
                href="mailto:caioveiber598@gmail.com"
              >
                caioveiber598@gmail.com
              </a>
              .
            </p>
            <Button
              className="mt-6 w-full"
              onClick={() => setSignupUnavailableOpen(false)}
            >
              Entendi
            </Button>
          </div>
        </div>
      ) : null}

      <VersionOutdatedModal open={versionOutdated} />
    </>
  )
}

function modeButtonClass(active: boolean) {
  return [
    'h-10 rounded-[14px] text-sm font-bold transition',
    active
      ? 'duocal-gradient text-white shadow-[0_8px_20px_rgba(84,102,241,0.24)]'
      : 'text-(--duocal-muted)',
  ].join(' ')
}

async function registrarLoginSemBloquear() {
  const { error } = await supabase.rpc('rpc_registrar_login_usuario')

  if (error && !errorContains(error, 'PERFIL_NAO_ENCONTRADO')) {
    throw error
  }
}
