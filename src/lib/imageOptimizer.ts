const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024 // 5 MB
const MAX_DIMENSION = 512
const WEBP_QUALITY = 0.85

export class ImageOtimizadorError extends Error {}

export async function otimizarImagemParaWebP(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new ImageOtimizadorError('Apenas imagens são aceitas.')
  }

  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new ImageOtimizadorError('A imagem deve ter no máximo 5 MB.')
  }

  const bitmap = await createImageBitmap(file)
  const { width, height } = bitmap

  // Corte central quadrado
  const lado = Math.min(width, height)
  const sx = Math.floor((width - lado) / 2)
  const sy = Math.floor((height - lado) / 2)

  const outputSize = Math.min(lado, MAX_DIMENSION)

  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new ImageOtimizadorError('Não foi possível processar a imagem.')
  }

  ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, outputSize, outputSize)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new ImageOtimizadorError('Falha ao converter a imagem para WebP.'))
          return
        }
        resolve(blob)
      },
      'image/webp',
      WEBP_QUALITY,
    )
  })
}
