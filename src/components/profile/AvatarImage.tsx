import { useState } from 'react'
import { getAvatarUrl } from '../../lib'

type Props = {
  avatarPath: string | null
  nome: string | null
  size?: number
  background?: string
  className?: string
}

function getIniciais(nome: string | null): string {
  if (!nome) return '?'
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

export function AvatarImage({
  avatarPath,
  nome,
  size = 40,
  background = 'var(--duocal-primary)',
  className,
}: Props) {
  const [imgError, setImgError] = useState(false)
  const url = avatarPath ? getAvatarUrl(avatarPath) : null
  const showImage = Boolean(url) && !imgError
  const fontSize = Math.round(size * 0.36)

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={url!}
          alt={nome ?? 'Avatar'}
          className="size-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="grid size-full place-items-center font-black text-white"
          style={{ background, fontSize }}
        >
          {getIniciais(nome)}
        </div>
      )}
    </div>
  )
}
