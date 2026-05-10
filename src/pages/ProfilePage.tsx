import { useEffect, useState } from 'react'
import { Copy, Link2, LogOut, Share2, UserRound } from 'lucide-react'
import {
  BottomNavigation,
  Button,
  FeedbackAlert,
  ProfileSetupModal,
  ScreenContainer,
  VersionOutdatedModal,
} from '../components'
import {
  useAuthSession,
  useMeuPerfil,
  useUnreadNotificationCount,
  useWorkspaceAtual,
} from '../hooks'
import { getErrorMessage, isVersionOutdatedError, supabase } from '../lib'

export function ProfilePage() {
  const { session, isLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil = perfilQuery.data ?? null
  const workspaceQuery = useWorkspaceAtual(perfil)
  const workspace = workspaceQuery.data ?? null
  const { unreadCount } = useUnreadNotificationCount(perfil)

  const [feedback, setFeedback] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [versionOutdated, setVersionOutdated] = useState(false)

  useEffect(() => {
    if (!isLoading && !session) {
      window.location.replace('/login')
    }
  }, [isLoading, session])

  const perfilIncompleto = Boolean(
    perfil && (!perfil.fl_perfil_completo || !perfil.nm_usuario),
  )

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  async function handleCopyCode() {
    if (!perfil?.cd_codigo_conexao) return

    try {
      await navigator.clipboard.writeText(perfil.cd_codigo_conexao)
      setFeedback('Código copiado.')
      setErro(null)
    } catch {
      setErro('Não foi possível copiar o código.')
    }
  }

  async function handleShareLink() {
    if (!perfil?.cd_codigo_conexao) return

    const url = `${window.location.origin}/conectar?codigo=${perfil.cd_codigo_conexao}`

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: 'DuoCal',
          text: 'Use este código para solicitar conexão no DuoCal.',
          url,
        })
      } else {
        await navigator.clipboard.writeText(url)
        setFeedback('Link de conexão copiado.')
      }

      setErro(null)
    } catch (error) {
      if (isVersionOutdatedError(error)) {
        setVersionOutdated(true)
        return
      }

      if ((error as { name?: string }).name !== 'AbortError') {
        setErro(getErrorMessage(error))
      }
    }
  }

  return (
    <>
      <ScreenContainer withBottomNavigation>
        <header className="pb-5">
          <p className="text-sm font-semibold text-[var(--duocal-muted)]">Conta</p>
          <h1 className="mt-1 text-3xl font-black text-[var(--duocal-text)]">Perfil</h1>
        </header>

        {/* Card do usuário */}
        <section className="duocal-card p-5">
          <div className="flex items-center gap-3">
            <div className="duocal-gradient grid size-14 shrink-0 place-items-center rounded-[22px] text-white shadow-[0_10px_24px_rgba(84,102,241,0.24)]">
              <UserRound className="size-7" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-[var(--duocal-text)]">
                {perfil?.nm_usuario ?? 'Seu perfil'}
              </h2>
              <p className="truncate text-sm text-[var(--duocal-muted)]">
                {perfil?.ds_email ?? session?.user.email ?? ''}
              </p>
            </div>
          </div>
        </section>

        {/* Feedback */}
        {(feedback || erro) ? (
          <FeedbackAlert
            className="mt-4"
            message={feedback ?? erro ?? ''}
            onClose={() => {
              setFeedback(null)
              setErro(null)
            }}
            variant={erro ? 'error' : 'success'}
          />
        ) : null}

        {/* Código de conexão */}
        {perfil?.cd_codigo_conexao ? (
          <section className="mt-4 duocal-gradient rounded-[30px] p-5 text-white shadow-[0_18px_50px_rgba(84,102,241,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white/78">
                  Código de conexão
                </p>
                <p className="mt-2 text-3xl font-black tracking-[0.22em]">
                  {perfil.cd_codigo_conexao}
                </p>
              </div>
              <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/18">
                <Link2 className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-sm leading-5 text-white/78">
              Compartilhe este código ou link com quem vai dividir o workspace com você.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/16 px-4 text-sm font-bold text-white transition hover:bg-white/22"
              >
                <Copy className="size-4" />
                Copiar código
              </button>
              <button
                type="button"
                onClick={handleShareLink}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/16 px-4 text-sm font-bold text-white transition hover:bg-white/22"
              >
                <Share2 className="size-4" />
                Compartilhar
              </button>
            </div>
          </section>
        ) : null}

        {/* Workspace */}
        {workspace ? (
          <section className="mt-4 duocal-card p-5">
            <p className="text-sm font-semibold text-[var(--duocal-muted)]">
              Workspace compartilhado
            </p>
            <h2 className="mt-1 text-xl font-black text-[var(--duocal-text)]">
              {workspace.workspace.nm_workspace}
            </h2>
            {workspace.workspace.ds_slogan ? (
              <p className="mt-1 text-sm text-[var(--duocal-muted)]">
                {workspace.workspace.ds_slogan}
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--duocal-surface-soft)] px-4 py-3 text-sm">
              <span className="text-[var(--duocal-muted)]">Membros ativos</span>
              <span className="font-bold text-[var(--duocal-text)]">
                {workspace.total_membros}
              </span>
            </div>
          </section>
        ) : null}

        {/* Sessão */}
        <section className="mt-4 duocal-card p-5">
          <h2 className="text-base font-black text-[var(--duocal-text)]">Sessão</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--duocal-muted)]">
            Gerencie o acesso desta conta no dispositivo atual.
          </p>
          <Button
            className="mt-4 w-full"
            icon={<LogOut className="size-4" />}
            onClick={handleSignOut}
            variant="danger"
          >
            Sair da conta
          </Button>
        </section>
      </ScreenContainer>

      <BottomNavigation activeTab="profile" unreadCount={unreadCount} />
      {perfilIncompleto && perfil ? <ProfileSetupModal perfil={perfil} /> : null}
      <VersionOutdatedModal open={versionOutdated} />
    </>
  )
}
