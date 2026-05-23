import { useEffect, useState } from 'react'
import { Bell, ChevronRight, Link2, LogOut, Palette, Plus, Settings, Shield, Tag, UserRound } from 'lucide-react'
import {
  BottomNavigation,
  FeedbackAlert,
  ProfileSetupModal,
  ScreenContainer,
  VersionOutdatedModal,
} from '../components'
import { CategoryManagementSheet } from '../components/profile/CategoryManagementSheet'
import { ConnectionCodeSheet } from '../components/profile/ConnectionCodeSheet'
import { ProfileHeroCard } from '../components/profile/ProfileHeroCard'
import { ProfileMenuItem } from '../components/profile/ProfileMenuItem'
import {
  useAuthSession,
  useMembrosWorkspace,
  useMeuPerfil,
  useUnreadNotificationCount,
  useWorkspaceAtual,
} from '../hooks'
import { appVersion, supabase } from '../lib'

function getIniciais(nome: string | null): string {
  if (!nome) return '?'
  const partes = nome.trim().split(/\s+/)
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

export function ProfilePage() {
  const { session, isLoading } = useAuthSession()
  const perfilQuery = useMeuPerfil(Boolean(session))
  const perfil = perfilQuery.data ?? null
  const workspaceQuery = useWorkspaceAtual(perfil)
  const workspace = workspaceQuery.data ?? null
  const membrosQuery = useMembrosWorkspace(workspace?.workspace.id)
  const membros = membrosQuery.data ?? []
  const { unreadCount } = useUnreadNotificationCount(perfil)

  const [feedback, setFeedback] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [codeSheetOpen, setCodeSheetOpen] = useState(false)
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [versionOutdated] = useState(false)

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

  function showWip() {
    setFeedback('Funcionalidade em construção.')
    setErro(null)
  }

  return (
    <>
      <ScreenContainer withBottomNavigation>
        {/* Header */}
        <header className="pb-5">
          <p className="text-sm font-semibold text-(--duocal-muted)">Conta</p>
          <h1 className="mt-1 text-3xl font-black text-(--duocal-text)">Perfil</h1>
        </header>

        {/* Feedback */}
        {feedback || erro ? (
          <FeedbackAlert
            className="mb-4"
            message={feedback ?? erro ?? ''}
            onClose={() => { setFeedback(null); setErro(null) }}
            variant={erro ? 'error' : 'success'}
          />
        ) : null}

        {/* — Hero card (com workspace) ou card simples (sem workspace) — */}
        {workspace ? (
          <ProfileHeroCard workspace={workspace} membros={membros} />
        ) : (
          <section className="duocal-card p-5">
            <div className="flex items-center gap-3">
              <div className="duocal-gradient grid size-14 shrink-0 place-items-center rounded-[22px] text-white shadow-[0_10px_24px_rgba(84,102,241,0.24)]">
                <UserRound className="size-7" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-(--duocal-text)">
                  {perfil?.nm_usuario ?? 'Seu perfil'}
                </h2>
                <p className="truncate text-sm text-(--duocal-muted)">
                  {perfil?.ds_email ?? session?.user.email ?? ''}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* — Seção Membros (só com workspace) — */}
        {workspace ? (
          <section className="mt-5">
            <p className="mb-2 px-1 text-[11px] font-bold tracking-widest text-(--duocal-muted)">
              MEMBROS
            </p>
            <div className="duocal-card overflow-hidden divide-y divide-(--duocal-border)">
              {membros.map((membro) => {
                const ehVoce = membro.usuario_id === perfil?.id
                const papelLabel = membro.tp_papel === 'ADMIN' ? 'Admin' : 'Membro'
                return (
                  <div
                    key={membro.usuario_id}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <div
                      className="grid size-10 shrink-0 place-items-center rounded-full text-sm font-black text-white"
                      style={{
                        background: ehVoce
                          ? 'var(--duocal-primary)'
                          : 'var(--duocal-violet)',
                      }}
                    >
                      {getIniciais(membro.nm_usuario)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-(--duocal-text)">
                        {membro.nm_usuario}
                      </p>
                      <p className="truncate text-xs text-(--duocal-muted)">
                        {ehVoce
                          ? `Você · ${papelLabel} · ${membro.ds_email}`
                          : `${papelLabel} · ${membro.ds_email}`}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-(--duocal-border)" />
                  </div>
                )
              })}

              {/* Convidar membro */}
              <button
                type="button"
                onClick={showWip}
                className="flex w-full items-center gap-3 px-4 py-3.5 transition hover:bg-(--duocal-surface-soft)"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[rgba(182,109,255,0.12)]">
                  <Plus className="size-5 text-(--duocal-violet)" />
                </div>
                <span className="text-sm font-semibold text-(--duocal-primary)">
                  Convidar membro
                </span>
              </button>
            </div>
          </section>
        ) : null}

        {/* — Seção Workspace / Configurações — */}
        <section className="mt-5">
          <p className="mb-2 px-1 text-[11px] font-bold tracking-widest text-(--duocal-muted)">
            {workspace ? 'WORKSPACE' : 'CONFIGURAÇÕES'}
          </p>
          <div className="duocal-card overflow-hidden divide-y divide-(--duocal-border)">
            {workspace ? (
              <>
                <ProfileMenuItem
                  icon={<Settings className="size-[17px] text-(--duocal-primary)" />}
                  iconBg="rgba(84,102,241,0.12)"
                  label="Configurações do workspace"
                  sublabel="Nome, fuso, idioma"
                  onClick={showWip}
                />
                <ProfileMenuItem
                  icon={<Tag className="size-[17px] text-(--duocal-violet)" />}
                  iconBg="rgba(182,109,255,0.12)"
                  label="Categorias"
                  sublabel="Organize seus eventos"
                  onClick={() => setCategorySheetOpen(true)}
                />
              </>
            ) : null}

            <ProfileMenuItem
              icon={<Link2 className="size-[17px] text-(--duocal-success)" />}
              iconBg="rgba(53,207,165,0.12)"
              label="Convite por código"
              sublabel={
                perfil?.cd_codigo_conexao
                  ? `Código: ${perfil.cd_codigo_conexao}`
                  : 'Compartilhe seu link de conexão'
              }
              onClick={() => setCodeSheetOpen(true)}
            />
            <ProfileMenuItem
              icon={<Bell className="size-[17px] text-(--duocal-warning)" />}
              iconBg="rgba(255,176,32,0.12)"
              label="Notificações"
              sublabel="Preferências personalizadas"
              onClick={showWip}
            />
            <ProfileMenuItem
              icon={<Palette className="size-[17px] text-[#FF5A7A]" />}
              iconBg="rgba(255,90,122,0.10)"
              label="Tema do app"
              sublabel="Sistema"
              onClick={showWip}
            />
            <ProfileMenuItem
              icon={<Shield className="size-[17px] text-(--duocal-muted)" />}
              iconBg="rgba(107,114,128,0.10)"
              label="Privacidade & dados"
              sublabel="Segurança e permissões"
              onClick={showWip}
            />
          </div>
        </section>

        {/* — Código em destaque (apenas sem workspace) — */}
        {!workspace && perfil?.cd_codigo_conexao ? (
          <section
            className="mt-5 rounded-[30px] p-5 text-white shadow-[0_18px_50px_rgba(84,102,241,0.22)]"
            style={{ background: 'linear-gradient(135deg, #5466F1 0%, #B66DFF 100%)' }}
          >
            <p className="text-sm font-semibold text-white/80">Código de conexão</p>
            <p className="mt-2 text-4xl font-black tracking-[0.28em]">
              {perfil.cd_codigo_conexao}
            </p>
            <p className="mt-2 text-sm leading-5 text-white/78">
              Compartilhe com quem vai dividir o workspace com você.
            </p>
            <button
              type="button"
              onClick={() => setCodeSheetOpen(true)}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white/16 text-sm font-bold text-white transition hover:bg-white/22"
            >
              Copiar ou compartilhar
            </button>
          </section>
        ) : null}

        {/* — Botão sair — */}
        <section className="mt-5">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-3xl border border-[rgba(255,90,122,0.20)] bg-white py-4 text-sm font-bold text-(--duocal-danger) shadow-[0_4px_16px_rgba(255,90,122,0.06)] transition hover:bg-[rgba(255,90,122,0.04)]"
          >
            <LogOut className="size-4" />
            Sair da conta
          </button>
        </section>

        {/* — Versão — */}
        <div className="mt-6 pb-2 text-center">
          <p className="text-[11px] font-bold tracking-widest text-(--duocal-border)">
            DUOCAL · {appVersion}
          </p>
        </div>
      </ScreenContainer>

      <BottomNavigation activeTab="profile" unreadCount={unreadCount} />
      {perfilIncompleto && perfil ? <ProfileSetupModal perfil={perfil} /> : null}
      <VersionOutdatedModal open={versionOutdated} />

      {codeSheetOpen && perfil?.cd_codigo_conexao ? (
        <ConnectionCodeSheet
          codigo={perfil.cd_codigo_conexao}
          onClose={() => setCodeSheetOpen(false)}
        />
      ) : null}

      {categorySheetOpen && workspace ? (
        <CategoryManagementSheet
          workspaceId={workspace.workspace.id}
          onClose={() => setCategorySheetOpen(false)}
        />
      ) : null}
    </>
  )
}
