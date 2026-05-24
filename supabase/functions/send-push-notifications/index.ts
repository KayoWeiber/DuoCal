import { createClient } from 'npm:@supabase/supabase-js@2'

type NotificationRow = {
  ds_mensagem: string
  ds_url_destino: string | null
  entidade_id: string | null
  id: string
  js_metadata: Record<string, unknown> | null
  nm_titulo: string
  tp_entidade: string | null
  tp_notificacao: string
  usuario_destino_id: string
  workspace_id: string
}

type SubscriptionRow = {
  auth: string
  endpoint: string
  id: string
  p256dh: string
}

type PreferenceRow = {
  fl_alteracoes_agenda: boolean
  fl_convites: boolean
  fl_eventos: boolean
  fl_lembretes: boolean
  push_subscription_id: string
}

type PushPayload = {
  body: string
  metadata: Record<string, unknown>
  tag: string
  tipo: string
  title: string
  url: string
}

type RequestBody = {
  limit?: number
  notificacaoId?: string
  source?: string
}

const encoder = new TextEncoder()
const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
const vapidSubject = Deno.env.get('VAPID_SUBJECT')
const cronSecret = Deno.env.get('PUSH_CRON_SECRET')

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao configurados.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 })
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 })
  }

  if (!isAuthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return Response.json(
      { error: 'VAPID keys nao configuradas.' },
      { status: 500 },
    )
  }

  const body = await readRequestBody(req)
  const limit = clampLimit(body.limit)
  const { data: notificacoes, error } = await buildNotificationQuery(
    limit,
    body.notificacaoId,
  )

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0
  let ignored = 0

  for (const notificacao of notificacoes ?? []) {
    const result = await processNotification(notificacao)
    sent += result.sent
    failed += result.failed
    ignored += result.ignored
  }

  return Response.json({
    failed,
    ignored,
    processadas: notificacoes?.length ?? 0,
    sent,
    source: body.source ?? 'manual',
  })
})

async function buildNotificationQuery(limit: number, notificacaoId?: string) {
  let query = supabase
    .from('fato_notificacao')
    .select(
      [
        'id',
        'workspace_id',
        'usuario_destino_id',
        'tp_notificacao',
        'nm_titulo',
        'ds_mensagem',
        'tp_entidade',
        'entidade_id',
        'ds_url_destino',
        'js_metadata',
      ].join(','),
    )
    .not('workspace_id', 'is', null)
    .is('dt_enviada', null)
    .eq('fl_push_habilitada', true)
    .lte('dt_agendada', new Date().toISOString())
    .order('dt_agendada', { ascending: true })
    .limit(limit)

  if (notificacaoId) {
    query = query.eq('id', notificacaoId)
  }

  return query.returns<NotificationRow[]>()
}

async function processNotification(notificacao: NotificationRow) {
  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('rel_push_subscription')
    .select('id, endpoint, p256dh, auth')
    .eq('workspace_id', notificacao.workspace_id)
    .eq('usuario_id', notificacao.usuario_destino_id)
    .eq('fl_ativo', true)
    .returns<SubscriptionRow[]>()

  if (subscriptionError) {
    await logPushResult({
      erro: subscriptionError.message,
      notificacao,
      payload: buildPayload(notificacao),
      status: 'ERRO',
    })
    return { failed: 1, ignored: 0, sent: 0 }
  }

  if (!subscriptions || subscriptions.length === 0) {
    await logPushResult({
      notificacao,
      payload: buildPayload(notificacao),
      status: 'IGNORADO',
    })
    await markNotificationProcessed(notificacao.id)
    return { failed: 0, ignored: 1, sent: 0 }
  }

  const payload = buildPayload(notificacao)
  let preferences: Map<string, PreferenceRow>

  try {
    preferences = await fetchPreferences(notificacao)
  } catch (error) {
    await logPushResult({
      erro: error instanceof Error ? error.message : String(error),
      notificacao,
      payload,
      status: 'ERRO',
    })
    return { failed: 1, ignored: 0, sent: 0 }
  }

  let sent = 0
  let failed = 0
  let ignored = 0

  for (const subscription of subscriptions) {
    const preference = preferences.get(subscription.id)

    if (!isNotificationEnabled(notificacao.tp_notificacao, preference)) {
      await logPushResult({
        notificacao,
        payload,
        pushSubscriptionId: subscription.id,
        status: 'IGNORADO',
      })
      ignored += 1
      continue
    }

    try {
      const httpStatus = await sendWebPush(subscription, payload)
      await logPushResult({
        httpStatus,
        notificacao,
        payload,
        pushSubscriptionId: subscription.id,
        status: 'ENVIADO',
      })
      sent += 1
    } catch (error) {
      const pushError = normalizePushError(error)

      await logPushResult({
        erro: pushError.message,
        httpStatus: pushError.httpStatus,
        notificacao,
        payload,
        pushSubscriptionId: subscription.id,
        status: 'ERRO',
      })

      if (isExpiredSubscriptionStatus(pushError.httpStatus)) {
        await deactivateSubscription(subscription.id)
      }

      failed += 1
    }
  }

  await markNotificationProcessed(notificacao.id)
  return { failed, ignored, sent }
}

async function fetchPreferences(notificacao: NotificationRow) {
  const { data, error } = await supabase
    .from('cfg_preferencia_notificacao_push')
    .select(
      [
        'push_subscription_id',
        'fl_eventos',
        'fl_lembretes',
        'fl_convites',
        'fl_alteracoes_agenda',
      ].join(','),
    )
    .eq('workspace_id', notificacao.workspace_id)
    .eq('usuario_id', notificacao.usuario_destino_id)
    .returns<PreferenceRow[]>()

  if (error) {
    throw error
  }

  return new Map((data ?? []).map((row) => [row.push_subscription_id, row]))
}

function isNotificationEnabled(
  tipo: string,
  preference: PreferenceRow | undefined,
) {
  if (!preference) {
    return true
  }

  if (tipo.includes('CONVITE') || tipo.includes('SOLICITACAO')) {
    return preference.fl_convites
  }

  if (tipo === 'LEMBRETE_EVENTO') {
    return preference.fl_eventos && preference.fl_lembretes
  }

  if (tipo.startsWith('EVENTO_')) {
    return preference.fl_eventos && preference.fl_alteracoes_agenda
  }

  return true
}

function buildPayload(notificacao: NotificationRow): PushPayload {
  return {
    body: notificacao.ds_mensagem,
    metadata: {
      entidadeId: notificacao.entidade_id,
      tipoEntidade: notificacao.tp_entidade,
      ...(notificacao.js_metadata ?? {}),
    },
    tag: notificacao.id,
    tipo: notificacao.tp_notificacao,
    title: notificacao.nm_titulo,
    url: notificacao.ds_url_destino ?? '/notificacoes',
  }
}

async function sendWebPush(
  subscription: SubscriptionRow,
  payload: PushPayload,
) {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    throw new Error('VAPID keys nao configuradas.')
  }

  const encryptedBody = await encryptPushPayload(subscription, payload)
  const authorization = await createVapidAuthorization({
    endpoint: subscription.endpoint,
    privateKey: vapidPrivateKey,
    publicKey: vapidPublicKey,
    subject: vapidSubject,
  })

  const response = await fetch(subscription.endpoint, {
    body: encryptedBody,
    headers: {
      Authorization: authorization,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '2419200',
      Urgency: 'normal',
    },
    method: 'POST',
  })

  if (!response.ok) {
    throw new PushSendError(
      response.status,
      (await response.text()).slice(0, 1000),
    )
  }

  return response.status
}

async function encryptPushPayload(
  subscription: SubscriptionRow,
  payload: PushPayload,
) {
  const userPublicKey = base64UrlToUint8Array(subscription.p256dh)
  const authSecret = base64UrlToUint8Array(subscription.auth)
  const serverKeys = await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveBits'],
  )
  const serverPublicKey = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeys.publicKey),
  )
  const importedUserKey = await crypto.subtle.importKey(
    'raw',
    userPublicKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    [],
  )
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: importedUserKey,
      },
      serverKeys.privateKey,
      256,
    ),
  )

  const prkKey = await hmac(authSecret, sharedSecret)
  const keyInfo = concatBytes(
    encoder.encode('WebPush: info'),
    new Uint8Array([0]),
    userPublicKey,
    serverPublicKey,
  )
  const ikm = await hmac(prkKey, keyInfo)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const prk = await hmac(salt, ikm)
  const cek = await hkdfExpand(
    prk,
    encoder.encode('Content-Encoding: aes128gcm\0'),
    16,
  )
  const nonce = await hkdfExpand(
    prk,
    encoder.encode('Content-Encoding: nonce\0'),
    12,
  )
  const record = concatBytes(
    encoder.encode(JSON.stringify(payload)),
    new Uint8Array([2]),
  )
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, [
    'encrypt',
  ])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        iv: nonce,
        name: 'AES-GCM',
      },
      aesKey,
      record,
    ),
  )

  return concatBytes(
    salt,
    uint32ToBytes(4096),
    new Uint8Array([serverPublicKey.length]),
    serverPublicKey,
    ciphertext,
  )
}

async function createVapidAuthorization(params: {
  endpoint: string
  privateKey: string
  publicKey: string
  subject: string
}) {
  const publicKeyBytes = base64UrlToUint8Array(params.publicKey)
  const privateKeyBytes = base64UrlToUint8Array(params.privateKey)

  if (publicKeyBytes.length !== 65) {
    throw new Error('VAPID_PUBLIC_KEY invalida.')
  }

  const jwk = {
    crv: 'P-256',
    d: uint8ArrayToBase64Url(privateKeyBytes),
    ext: false,
    key_ops: ['sign'],
    kty: 'EC',
    x: uint8ArrayToBase64Url(publicKeyBytes.slice(1, 33)),
    y: uint8ArrayToBase64Url(publicKeyBytes.slice(33, 65)),
  }
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign'],
  )
  const header = uint8ArrayToBase64Url(
    encoder.encode(JSON.stringify({ alg: 'ES256', typ: 'JWT' })),
  )
  const claims = uint8ArrayToBase64Url(
    encoder.encode(
      JSON.stringify({
        aud: getEndpointAudience(params.endpoint),
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: params.subject,
      }),
    ),
  )
  const signingInput = `${header}.${claims}`
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      {
        hash: 'SHA-256',
        name: 'ECDSA',
      },
      privateKey,
      encoder.encode(signingInput),
    ),
  )

  return `vapid t=${signingInput}.${uint8ArrayToBase64Url(signature)}, k=${params.publicKey}`
}

async function hmac(keyBytes: Uint8Array, value: Uint8Array) {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    {
      hash: 'SHA-256',
      name: 'HMAC',
    },
    false,
    ['sign'],
  )

  return new Uint8Array(await crypto.subtle.sign('HMAC', key, value))
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number) {
  const blocks: Uint8Array[] = []
  let previous = new Uint8Array()
  let generatedLength = 0
  let counter = 1

  while (generatedLength < length) {
    previous = await hmac(
      prk,
      concatBytes(previous, info, new Uint8Array([counter])),
    )
    blocks.push(previous)
    generatedLength += previous.length
    counter += 1
  }

  return concatBytes(...blocks).slice(0, length)
}

async function markNotificationProcessed(notificacaoId: string) {
  await supabase
    .from('fato_notificacao')
    .update({
      dt_enviada: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', notificacaoId)
}

async function deactivateSubscription(subscriptionId: string) {
  await supabase
    .from('rel_push_subscription')
    .update({
      fl_ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
}

async function logPushResult(params: {
  erro?: string
  httpStatus?: number
  notificacao: NotificationRow
  payload: PushPayload
  pushSubscriptionId?: string
  status: 'ENVIADO' | 'ERRO' | 'IGNORADO'
}) {
  await supabase.from('fato_notificacao_push_log').insert({
    ds_erro: params.erro ?? null,
    http_status: params.httpStatus ?? null,
    js_payload: params.payload,
    notificacao_id: params.notificacao.id,
    push_subscription_id: params.pushSubscriptionId ?? null,
    tp_status: params.status,
    workspace_id: params.notificacao.workspace_id,
  })
}

function isAuthorized(req: Request) {
  if (!cronSecret) {
    return false
  }

  return (
    req.headers.get('authorization') === `Bearer ${cronSecret}` ||
    req.headers.get('x-duocal-cron-secret') === cronSecret
  )
}

async function readRequestBody(req: Request): Promise<RequestBody> {
  try {
    return (await req.json()) as RequestBody
  } catch {
    return {}
  }
}

function clampLimit(limit: number | undefined) {
  if (!limit || !Number.isFinite(limit)) {
    return 100
  }

  return Math.max(1, Math.min(Math.trunc(limit), 250))
}

function getEndpointAudience(endpoint: string) {
  const url = new URL(endpoint)
  return `${url.protocol}//${url.host}`
}

function normalizePushError(error: unknown) {
  if (error instanceof PushSendError) {
    return {
      httpStatus: error.httpStatus,
      message: error.message,
    }
  }

  return {
    httpStatus: undefined,
    message: error instanceof Error ? error.message : String(error),
  }
}

function isExpiredSubscriptionStatus(status: number | undefined) {
  return status === 404 || status === 410
}

function base64UrlToUint8Array(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function uint8ArrayToBase64Url(value: Uint8Array) {
  let binary = ''

  for (const byte of value) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function concatBytes(...arrays: Uint8Array[]) {
  const totalLength = arrays.reduce((total, array) => total + array.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const array of arrays) {
    result.set(array, offset)
    offset += array.length
  }

  return result
}

function uint32ToBytes(value: number) {
  const bytes = new Uint8Array(4)
  bytes[0] = (value >>> 24) & 0xff
  bytes[1] = (value >>> 16) & 0xff
  bytes[2] = (value >>> 8) & 0xff
  bytes[3] = value & 0xff
  return bytes
}

class PushSendError extends Error {
  readonly httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message || `Push service retornou HTTP ${httpStatus}.`)
    this.httpStatus = httpStatus
  }
}
