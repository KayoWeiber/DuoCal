export const versionOutdatedMessage =
  'Sua versão do DuoCal está desatualizada. Atualize o aplicativo para continuar.'

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return 'Nao foi possivel concluir a operacao.'
}

export function isVersionOutdatedError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const maybeError = error as { details?: unknown; message?: unknown }

  return (
    maybeError.details === 'VERSAO_CLIENTE_OBSOLETA' ||
    maybeError.message === versionOutdatedMessage
  )
}
