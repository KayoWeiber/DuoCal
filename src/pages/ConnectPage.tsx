import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, Link2, Send } from 'lucide-react'
import {
  Button,
  FeedbackAlert,
  ProfileSetupModal,
  ScreenContainer,
  VersionOutdatedModal,
} from '../components'
import {
  useAuthSession,
  useMeuPerfil,
  useSolicitarConexaoPorCodigo,
} from '../hooks'
import {
  clearPendingConnectionCode,
  getErrorMessage,
  isVersionOutdatedError,
  savePendingConnectionCode,
} from '../lib'

export function ConnectPage() {
  const { session, isLoading: isSessionLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil = perfilQuery.data ?? null
  const solicitarConexao = useSolicitarConexaoPorCodigo()
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [versionOutdated, setVersionOutdated] = useState(false)

  const codigo = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('codigo')?.trim() ?? ''
  }, [])

  const codigoValido = /^\d{6}$/.test(codigo)

  useEffect(() => {
    if (isSessionLoading || session || !codigoValido) {
      return
    }

    savePendingConnectionCode(codigo)
    window.location.replace('/login')
  }, [codigo, codigoValido, isSessionLoading, session])

  async function handleSolicitarConexao() {
    setErrorMessage(null)
    setFeedbackMessage(null)

    if (!codigoValido) {
      setErrorMessage('O link de conexão possui um código inválido.')
      return
    }

    if (codigo === perfil?.cd_codigo_conexao) {
      setErrorMessage('Você não pode solicitar conexão usando o próprio código.')
      return
    }

    try {
      await solicitarConexao.mutateAsync(codigo)
      clearPendingConnectionCode()
      setFeedbackMessage(
        'Solicitação enviada. Agora é só aguardar a outra pessoa aceitar.',
      )
    } catch (error) {
      if (isVersionOutdatedError(error)) {
        setVersionOutdated(true)
        return
      }

      setErrorMessage(getErrorMessage(error))
    }
  }

  if (isSessionLoading || (!session && codigoValido)) {
    return <LoadingState message="Preparando conexão..." />
  }

  if (!codigoValido) {
    return (
      <ConnectShell>
        <StateContent
          description="Use um link no formato /conectar?codigo=XXXXXX."
          title="Código inválido"
        />
      </ConnectShell>
    )
  }

  if (perfilQuery.isLoading) {
    return <LoadingState message="Carregando seu perfil..." />
  }

  if (perfilQuery.error) {
    return (
      <ConnectShell>
        <StateContent
          description={getErrorMessage(perfilQuery.error)}
          title="Não foi possível carregar seu perfil"
        />
      </ConnectShell>
    )
  }

  const perfilIncompleto = Boolean(perfil && !perfil.fl_perfil_completo)

  return (
    <>
      <ConnectShell>
        <section className="duocal-card p-5">
          <div className="duocal-gradient flex size-12 items-center justify-center rounded-2xl text-white">
            <Link2 className="size-6" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-(--duocal-text)">
            Solicitar conexão
          </h1>
          <p className="mt-2 text-sm leading-6 text-(--duocal-muted)">
            Você recebeu um convite para enviar uma solicitação de conexão no
            DuoCal.
          </p>

          <div className="mt-5 rounded-3xl bg-(--duocal-surface-soft) p-4 text-center">
            <p className="text-sm font-semibold text-(--duocal-muted)">
              Código de conexão
            </p>
            <p className="mt-2 text-3xl font-black tracking-[0.22em] text-(--duocal-primary)">
              {codigo}
            </p>
          </div>

          {feedbackMessage ? (
            <FeedbackAlert
              className="mt-4"
              message={feedbackMessage}
              onClose={() => setFeedbackMessage(null)}
              variant="success"
            />
          ) : null}

          {errorMessage ? (
            <FeedbackAlert
              className="mt-4"
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
              title="Não foi possível enviar"
              variant="error"
            />
          ) : null}

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              icon={<ArrowLeft className="size-4" />}
              onClick={() => window.location.replace('/')}
              variant="secondary"
            >
              Voltar
            </Button>
            <Button
              disabled={Boolean(feedbackMessage) || perfilIncompleto}
              icon={<Send className="size-4" />}
              isLoading={solicitarConexao.isPending}
              onClick={handleSolicitarConexao}
            >
              Solicitar
            </Button>
          </div>
        </section>
      </ConnectShell>

      {perfilIncompleto && perfil ? <ProfileSetupModal perfil={perfil} /> : null}
      <VersionOutdatedModal open={versionOutdated} />
    </>
  )
}

function LoadingState({ message }: { message: string }) {
  return (
    <ScreenContainer className="items-center justify-center">
      <div className="duocal-gradient size-10 animate-pulse rounded-3xl" />
      <p className="mt-4 text-sm font-medium text-(--duocal-muted)">
        {message}
      </p>
    </ScreenContainer>
  )
}

function ConnectShell({ children }: { children: ReactNode }) {
  return <ScreenContainer className="justify-center">{children}</ScreenContainer>
}

function StateContent({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <section className="duocal-card p-5">
      <div className="duocal-gradient flex size-12 items-center justify-center rounded-2xl text-white">
        <Link2 className="size-6" />
      </div>
      <h1 className="mt-4 text-2xl font-black text-(--duocal-text)">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-6 text-(--duocal-muted)">
        {description}
      </p>
      <Button
        className="mt-5 w-full"
        onClick={() => window.location.replace('/')}
        variant="secondary"
      >
        Voltar ao DuoCal
      </Button>
    </section>
  )
}
