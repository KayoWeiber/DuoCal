import { useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
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
  const [confirmRemover, setConfirmRemover] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const atualizarAvatar = useAtualizarAvatarUsuario()
  const removerAvatar = useRemoverAvatarUsuario()

  const isLoading =
    uploading || atualizarAvatar.isPending || removerAvatar.isPending

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
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
        setErro(getErrorMessage(error) || 'Não foi possível salvar a foto. Tente novamente.')
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
    } catch (error) {
      setErro(getErrorMessage(error) || 'Não foi possível remover a foto.')
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Avatar clicável */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !isLoading && inputRef.current?.click()}
          disabled={isLoading}
          className="relative overflow-hidden rounded-full outline-none focus-visible:ring-2 focus-visible:ring-(--duocal-primary)"
          aria-label="Alterar foto de perfil"
        >
          <AvatarImage
            avatarPath={perfil.avatar_path}
            nome={perfil.nm_usuario}
            size={80}
            background="var(--duocal-primary)"
          />
          {/* Overlay de edição */}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 opacity-0 transition-opacity hover:opacity-100">
            <Camera className="size-5 text-white" />
          </div>
        </button>

        {/* Botão câmera fixo (mobile-friendly) */}
        <button
          type="button"
          onClick={() => !isLoading && inputRef.current?.click()}
          disabled={isLoading}
          className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-white shadow-md transition-colors"
          style={{ background: 'var(--duocal-primary)' }}
          aria-label="Selecionar foto"
        >
          <Camera className="size-3.5 text-white" />
        </button>

        {/* Spinner de loading */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
            <div className="size-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      {/* Ação textual */}
      <button
        type="button"
        onClick={() => !isLoading && inputRef.current?.click()}
        disabled={isLoading}
        className="text-xs font-semibold text-(--duocal-primary) disabled:opacity-50"
      >
        {perfil.avatar_path ? 'Alterar foto' : 'Adicionar foto'}
      </button>

      {/* Remover foto */}
      {perfil.avatar_path && !isLoading && (
        <>
          {confirmRemover ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-(--duocal-muted)">Remover foto?</span>
              <button
                type="button"
                onClick={handleRemover}
                className="text-xs font-bold text-(--duocal-danger)"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemover(false)}
                className="text-xs font-semibold text-(--duocal-muted)"
              >
                Não
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemover(true)}
              className="flex items-center gap-1 text-xs font-semibold text-(--duocal-muted)"
            >
              <Trash2 className="size-3" />
              Remover foto
            </button>
          )}
        </>
      )}

      {/* Erro */}
      {erro && (
        <div className="w-full max-w-xs">
          <FeedbackAlert
            message={erro}
            onClose={() => setErro(null)}
            title="Erro ao salvar foto"
            variant="error"
          />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />
    </div>
  )
}
