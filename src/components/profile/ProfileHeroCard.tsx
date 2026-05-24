import { Heart } from 'lucide-react'
import type { WorkspaceAtual, MembroWorkspace } from '../../hooks'
import { AvatarImage } from './AvatarImage'

type Props = {
  workspace: WorkspaceAtual
  membros: MembroWorkspace[]
}

function calcJuntos(dtEntrada: string): string {
  const diffMs = Date.now() - new Date(dtEntrada).getTime()
  const dias = Math.floor(diffMs / 86_400_000)
  if (dias < 30) return `${dias}d`
  const meses = Math.floor(dias / 30)
  if (meses < 12) return `${meses}m`
  return `${Math.floor(meses / 12)}a`
}

const AVATAR_COLORS = ['var(--duocal-primary)', 'var(--duocal-violet)', 'var(--duocal-muted)']

export function ProfileHeroCard({ workspace, membros }: Props) {
  const juntos = calcJuntos(workspace.dt_entrada)

  return (
    <section
      className="relative overflow-hidden rounded-[30px] p-5 shadow-[0_8px_32px_rgba(182,109,255,0.14)]"
      style={{
        background:
          'linear-gradient(135deg, rgba(84,102,241,0.08) 0%, rgba(182,109,255,0.13) 100%)',
        border: '1px solid rgba(182,109,255,0.18)',
      }}
    >
      {/* Coração decorativo */}
      <Heart
        className="pointer-events-none absolute -right-4 -top-4 size-28 text-(--duocal-violet)"
        style={{ opacity: 0.07 }}
        fill="currentColor"
      />

      {/* Avatares sobrepostos dos membros */}
      {membros.length > 0 && (
        <div className="mb-4 flex items-center">
          <div className="flex -space-x-2.5">
            {membros.slice(0, 3).map((m, i) => (
              <AvatarImage
                key={m.usuario_id}
                avatarPath={m.avatar_path}
                nome={m.nm_usuario}
                size={44}
                background={AVATAR_COLORS[i] ?? 'var(--duocal-muted)'}
                className="ring-2 ring-white"
              />
            ))}
          </div>
        </div>
      )}

      {/* Nome e slogan */}
      <h2 className="text-xl font-black text-(--duocal-text)">
        {workspace.workspace.nm_workspace}
      </h2>
      {workspace.workspace.ds_slogan ? (
        <p className="mt-1 text-sm italic text-(--duocal-muted)">
          "{workspace.workspace.ds_slogan}"
        </p>
      ) : null}

      {/* Stats */}
      <div className="mt-4 flex gap-2">
        <StatCard value={String(workspace.total_membros)} label="Membros" />
        <StatCard value={juntos} label="Juntos" />
      </div>
    </section>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-2xl bg-white/70 px-3 py-2.5 text-center backdrop-blur-sm">
      <p className="text-base font-black text-(--duocal-text)">{value}</p>
      <p className="text-[11px] font-semibold text-(--duocal-muted)">{label}</p>
    </div>
  )
}
