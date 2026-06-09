import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Camera, ImagePlus, Trash2, X } from 'lucide-react'
import {
  buildAvatarPath,
  getErrorMessage,
  ImageOtimizadorError,
  otimizarImagemParaWebP,
  supabase,
} from '../../lib'
import type { MeuPerfil } from '../../hooks'
import { useAtualizarAvatarUsuario, useRemoverAvatarUsuario } from '../../hooks'
import { AvatarImage } from './AvatarImage'
import { FeedbackAlert } from '../ui/FeedbackAlert'

type Props = {
  perfil: MeuPerfil
  workspaceId: string
}

export function AvatarUpload({ perfil, workspaceId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmRemover, setConfirmRemover] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const atualizarAvatar = useAtualizarAvatarUsuario()
  const removerAvatar = useRemoverAvatarUsuario()

  const isLoading =
    uploading || atualizarAvatar.isPending || removerAvatar.isPending
  const hasAvatar = Boolean(perfil.avatar_path)

  function handleOpenMenu() {
    if (isLoading) return

    setErro(null)
    setConfirmRemover(false)
    setMenuOpen(true)
  }

  function handleAlterarFoto() {
    if (isLoading) return

    setMenuOpen(false)
    setConfirmRemover(false)
    window.setTimeout(() => inputRef.current?.click(), 0)
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setErro(null)
    setUploading(true)

    try {
      const blob = await otimizarImagemParaWebP(file)
      const path = buildAvatarPath(workspaceId, perfil.id)

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, {
          contentType: 'image/webp',
          upsert: true,
        })

      if (uploadError) throw uploadError

      await atualizarAvatar.mutateAsync(path)
    } catch (error) {
      if (error instanceof ImageOtimizadorError) {
        setErro(error.message)
      } else {
        setErro(
          getErrorMessage(error) ||
            'Não foi possível salvar a foto. Tente novamente.',
        )
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemover() {
    if (!perfil.avatar_path) return

    setErro(null)
    setConfirmRemover(false)

    try {
      await supabase.storage.from('avatars').remove([perfil.avatar_path])
      await removerAvatar.mutateAsync()
      setMenuOpen(false)
    } catch (error) {
      setErro(getErrorMessage(error) || 'Não foi possível remover a foto.')
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-full bg-white p-1 shadow-[0_14px_34px_rgba(17,20,74,0.14)] ring-1 ring-[rgba(84,102,241,0.12)]">
        <div className="rounded-full bg-[linear-gradient(135deg,rgba(84,102,241,0.14),rgba(182,109,255,0.18))] p-1">
          <AvatarImage
            avatarPath={perfil.avatar_path}
            nome={perfil.nm_usuario}
            size={88}
            background="linear-gradient(135deg,#5466F1,#B66DFF)"
          />
        </div>

        <button
          type="button"
          onClick={handleOpenMenu}
          disabled={isLoading}
          className="absolute -right-0.5 -top-0.5 grid size-8 place-items-center rounded-full border-2 border-white text-white shadow-[0_8px_18px_rgba(84,102,241,0.32)] transition active:scale-[0.96] disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#5466F1,#B66DFF)' }}
          aria-label="Abrir opções da foto de perfil"
        >
          <Camera className="size-4" />
        </button>

        {isLoading ? (
          <div className="absolute inset-1 flex items-center justify-center rounded-full bg-black/45">
            <div className="size-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        ) : null}
      </div>

      {erro ? (
        <div className="w-full max-w-xs">
          <FeedbackAlert
            message={erro}
            onClose={() => setErro(null)}
            title="Erro ao salvar foto"
            variant="error"
          />
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      {menuOpen ? (
        <AvatarActionsSheet
          confirmRemover={confirmRemover}
          hasAvatar={hasAvatar}
          isLoading={isLoading}
          onAlterarFoto={handleAlterarFoto}
          onClose={() => {
            setMenuOpen(false)
            setConfirmRemover(false)
          }}
          onConfirmRemover={() => setConfirmRemover(true)}
          onRemoverFoto={handleRemover}
          onVoltarRemocao={() => setConfirmRemover(false)}
        />
      ) : null}
    </div>
  )
}

function AvatarActionsSheet({
  confirmRemover,
  hasAvatar,
  isLoading,
  onAlterarFoto,
  onClose,
  onConfirmRemover,
  onRemoverFoto,
  onVoltarRemocao,
}: {
  confirmRemover: boolean
  hasAvatar: boolean
  isLoading: boolean
  onAlterarFoto: () => void
  onClose: () => void
  onConfirmRemover: () => void
  onRemoverFoto: () => void
  onVoltarRemocao: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,20,74,0.36)] px-4 pb-4 backdrop-blur-sm sm:items-center">
      <section className="duocal-constrained-width w-full overflow-hidden rounded-[30px] bg-white shadow-[0_-18px_60px_rgba(17,20,74,0.18)]">
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-(--duocal-border)" />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-black text-(--duocal-text)">
              Foto de perfil
            </h2>
            <p className="mt-0.5 text-xs text-(--duocal-muted)">
              Escolha como deseja atualizar sua imagem.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-2xl bg-(--duocal-surface-soft) text-(--duocal-muted) transition hover:text-(--duocal-primary)"
            aria-label="Fechar opções da foto"
          >
            <X className="size-4" />
          </button>
        </div>

        {confirmRemover ? (
          <div className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div className="rounded-[24px] border border-[rgba(255,90,122,0.20)] bg-[rgba(255,90,122,0.06)] p-4">
              <p className="text-sm font-black text-(--duocal-text)">
                Remover foto?
              </p>
              <p className="mt-1 text-xs leading-5 text-(--duocal-muted)">
                Seu avatar voltará a mostrar as iniciais do perfil.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onVoltarRemocao}
                  disabled={isLoading}
                  className="min-h-11 rounded-2xl bg-white text-sm font-bold text-(--duocal-muted) shadow-[0_4px_14px_rgba(17,20,74,0.06)] transition disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={onRemoverFoto}
                  disabled={isLoading}
                  className="min-h-11 rounded-2xl bg-(--duocal-danger) text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,90,122,0.22)] transition disabled:opacity-60"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <AvatarActionRow
              icon={<ImagePlus className="size-5" />}
              label={hasAvatar ? 'Alterar foto' : 'Adicionar foto'}
              onClick={onAlterarFoto}
            />
            {hasAvatar ? (
              <AvatarActionRow
                danger
                icon={<Trash2 className="size-5" />}
                label="Remover foto"
                onClick={onConfirmRemover}
              />
            ) : null}
          </div>
        )}
      </section>
    </div>
  )
}

function AvatarActionRow({
  danger = false,
  icon,
  label,
  onClick,
}: {
  danger?: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-[22px] bg-(--duocal-surface-soft) px-4 text-left transition active:scale-[0.99] hover:bg-[rgba(84,102,241,0.08)]"
    >
      <span
        className={[
          'grid size-10 shrink-0 place-items-center rounded-2xl',
          danger
            ? 'bg-[rgba(255,90,122,0.10)] text-(--duocal-danger)'
            : 'bg-[rgba(84,102,241,0.10)] text-(--duocal-primary)',
        ].join(' ')}
      >
        {icon}
      </span>
      <span
        className={[
          'text-sm font-black',
          danger ? 'text-(--duocal-danger)' : 'text-(--duocal-text)',
        ].join(' ')}
      >
        {label}
      </span>
    </button>
  )
}
