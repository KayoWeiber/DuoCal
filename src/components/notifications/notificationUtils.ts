export function formatRelativeTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'agora'
  }

  const diffInMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60_000),
  )

  if (diffInMinutes < 1) {
    return 'agora'
  }

  if (diffInMinutes < 60) {
    return `há ${diffInMinutes}m`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)

  if (diffInHours < 24) {
    return `há ${diffInHours}h`
  }

  if (diffInHours < 48) {
    return 'ontem'
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}
