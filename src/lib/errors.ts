export const versionOutdatedMessage =
  'Sua versão do DuoCal está desatualizada. Atualize o aplicativo para continuar.'

const defaultErrorMessage =
  'Não foi possível concluir agora. Tente novamente em instantes.'

const exactMessageMap = new Map<string, string>([
  ['Invalid login credentials', 'E-mail ou senha incorretos.'],
  ['Email not confirmed', 'Confirme seu e-mail antes de entrar.'],
  ['User not found', 'E-mail ou senha incorretos.'],
  ['User already registered', 'Este e-mail já está cadastrado.'],
  ['Signup requires a valid password', 'Informe uma senha válida.'],
  ['Password should be at least 6 characters', 'A senha precisa ter pelo menos 6 caracteres.'],
  ['Auth session missing!', 'Sua sessão expirou. Entre novamente.'],
  ['USUARIO_NAO_AUTENTICADO', 'Entre na sua conta para continuar.'],
  ['PERFIL_NAO_ENCONTRADO', 'Não encontramos seu perfil. Entre novamente.'],
  ['CODIGO_INVALIDO', 'Código de conexão inválido. Confira os 6 dígitos.'],
  ['TOKEN_INVALIDO', 'Código de conexão inválido. Confira os 6 dígitos.'],
  ['CODIGO_PROPRIO_NAO_PERMITIDO', 'Você não pode usar o próprio código.'],
  ['TOKEN_PROPRIO_NAO_PERMITIDO', 'Você não pode usar o próprio código.'],
  ['USUARIO_DESTINO_INATIVO', 'Este usuário não está ativo no DuoCal.'],
  ['USUARIO_JA_VINCULADO', 'Vocês já estão conectados em um workspace.'],
  ['USUARIO_JA_POSSUI_WORKSPACE', 'Você já possui um workspace ativo.'],
  ['SOLICITACAO_JA_EXISTE', 'Essa solicitação já foi enviada. Aguarde a resposta.'],
  ['CONFLITO_WORKSPACE_EXISTENTE', 'Não foi possível decidir o workspace automaticamente.'],
  ['SOLICITACAO_NAO_ENCONTRADA', 'Essa solicitação não está mais disponível.'],
  ['SOLICITACAO_NAO_AUTORIZADA', 'Você não pode responder essa solicitação.'],
  ['SOLICITACAO_JA_RESPONDIDA', 'Essa solicitação já foi respondida.'],
  ['SOLICITANTE_INATIVO', 'A pessoa que solicitou conexão não está ativa.'],
  ['SOLICITANTE_JA_POSSUI_WORKSPACE', 'A pessoa solicitante já possui um workspace ativo.'],
  ['WORKSPACE_LIMITE_MEMBROS_ATINGIDO', 'Este workspace já atingiu o limite de membros.'],
  ['CODIGO_CONEXAO_IMUTAVEL', 'O código de conexão não pode ser alterado manualmente.'],
  ['AUTH_USER_ID_IMUTAVEL', 'Não foi possível alterar dados protegidos da conta.'],
  ['VERSAO_CLIENTE_OBSOLETA', versionOutdatedMessage],
])

const codeMessageMap = new Map<string, string>([
  ['400', 'Revise os dados informados e tente novamente.'],
  ['401', 'Sua sessão expirou. Entre novamente.'],
  ['403', 'Você não tem permissão para realizar esta ação.'],
  ['404', 'Não encontramos essa informação.'],
  ['409', 'Essa informação já existe no DuoCal.'],
  ['422', 'Revise os dados informados e tente novamente.'],
  ['42501', 'Você não tem permissão para realizar esta ação.'],
  ['23505', 'Essa informação já está em uso.'],
  ['23503', 'Não foi possível encontrar um dado relacionado.'],
  ['23514', 'Revise os dados informados e tente novamente.'],
  ['42883', 'O DuoCal precisa ser atualizado para concluir esta ação.'],
  ['PGRST116', 'Não encontramos essa informação.'],
])

const partialMessageMap: Array<[string, string]> = [
  ['invalid login credentials', 'E-mail ou senha incorretos.'],
  ['email not confirmed', 'Confirme seu e-mail antes de entrar.'],
  ['already registered', 'Este e-mail já está cadastrado.'],
  ['invalid email', 'Informe um e-mail válido.'],
  ['unable to validate email address', 'Informe um e-mail válido.'],
  ['rate limit', 'Muitas tentativas em pouco tempo. Aguarde alguns instantes.'],
  ['for security purposes', 'Aguarde alguns instantes antes de tentar novamente.'],
  ['too many requests', 'Muitas tentativas em pouco tempo. Aguarde alguns instantes.'],
  ['failed to fetch', 'Não foi possível conectar. Verifique sua internet.'],
  ['networkerror', 'Não foi possível conectar. Verifique sua internet.'],
  ['jwt expired', 'Sua sessão expirou. Entre novamente.'],
  ['auth session missing', 'Sua sessão expirou. Entre novamente.'],
  ['refresh token', 'Sua sessão expirou. Entre novamente.'],
  ['row-level security', 'Você não tem permissão para acessar essa informação.'],
  ['violates row-level security', 'Você não tem permissão para acessar essa informação.'],
  ['permission denied', 'Você não tem permissão para realizar esta ação.'],
  ['duplicate key value', 'Essa informação já está em uso.'],
  ['foreign key constraint', 'Não foi possível encontrar um dado relacionado.'],
  ['check constraint', 'Revise os dados informados e tente novamente.'],
  ['database error saving new user', 'Não foi possível preparar sua conta agora. Tente novamente em instantes.'],
  ['relation "', 'O DuoCal precisa ser atualizado para concluir esta ação.'],
  ['function min(uuid) does not exist', 'O DuoCal precisa ser atualizado para concluir esta ação.'],
  ['no function matches the given name', 'O DuoCal precisa ser atualizado para concluir esta ação.'],
]

export function getErrorMessage(error: unknown) {
  const rawError = getRawError(error)

  for (const value of rawError.values) {
    const exactMessage = exactMessageMap.get(value)

    if (exactMessage) {
      return exactMessage
    }
  }

  for (const code of rawError.codes) {
    const codeMessage = codeMessageMap.get(code)

    if (codeMessage) {
      return codeMessage
    }
  }

  const normalizedText = rawError.values.join(' ').toLowerCase()

  for (const [pattern, message] of partialMessageMap) {
    if (normalizedText.includes(pattern)) {
      return message
    }
  }

  return defaultErrorMessage
}

export function getRawErrorMessage(error: unknown) {
  return getRawError(error).values.join(' ')
}

export function errorContains(error: unknown, text: string) {
  return getRawErrorMessage(error).includes(text)
}

export function isVersionOutdatedError(error: unknown) {
  const rawError = getRawError(error)

  return (
    rawError.values.includes('VERSAO_CLIENTE_OBSOLETA') ||
    rawError.values.includes(versionOutdatedMessage)
  )
}

function getRawError(error: unknown) {
  const values = new Set<string>()
  const codes = new Set<string>()

  collectErrorValue(error, values, codes)

  return {
    codes: Array.from(codes).filter(Boolean),
    values: Array.from(values).filter(Boolean),
  }
}

function collectErrorValue(
  value: unknown,
  values: Set<string>,
  codes: Set<string>,
) {
  if (!value) {
    return
  }

  if (typeof value === 'string') {
    values.add(value)
    return
  }

  if (value instanceof Error) {
    values.add(value.message)
  }

  if (typeof value !== 'object') {
    return
  }

  const errorLike = value as {
    code?: unknown
    details?: unknown
    error_description?: unknown
    hint?: unknown
    message?: unknown
    name?: unknown
    status?: unknown
    statusCode?: unknown
  }

  addString(errorLike.message, values)
  addString(errorLike.details, values)
  addString(errorLike.hint, values)
  addString(errorLike.error_description, values)
  addString(errorLike.name, values)
  addCode(errorLike.code, codes)
  addCode(errorLike.status, codes)
  addCode(errorLike.statusCode, codes)
}

function addString(value: unknown, target: Set<string>) {
  if (typeof value === 'string' && value.trim()) {
    target.add(value.trim())
  }
}

function addCode(value: unknown, target: Set<string>) {
  if (typeof value === 'string' || typeof value === 'number') {
    target.add(String(value))
  }
}
