import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Bell, BellOff, CheckCircle2, Home, Info, Share2, Smartphone, X } from 'lucide-react'
import {
  getErrorMessage,
  getExistingPushSubscription,
  getPushEnvironment,
  getRawErrorMessage,
  getVapidPublicKey,
  registerServiceWorker,
  requestNotificationPermission,
  subscribeUserToPush,
  type PushEnvironment,
} from '../../lib'
import {
  useAtualizarPreferenciasPush,
  useDesativarPushSubscription,
  usePushSubscriptionStatus,
  useSalvarPushSubscription,
  type PushNotificationPreferences,
  type PushSubscriptionStatus,
} from '../../hooks'
import { Button } from '../ui/Button'
import { FeedbackAlert } from '../ui/FeedbackAlert'

type Props = {
  onClose: () => void
  workspaceId: string
}

type BrowserPushState = PushEnvironment & {
  endpoint: string | null
  isLoading: boolean
}

const initialBrowserState: BrowserPushState = {
  endpoint: null,
  hasNotification: false,
  hasPushManager: false,
  hasServiceWorker: false,
  isIos: false,
  isLoading: true,
  isStandalone: false,
  isSupported: false,
  permission: 'unsupported',
}

const reminderShortcutMinutes = [15, 30, 60]

export function PushNotificationsSheet({ onClose, workspaceId }: Props) {
  const [browserState, setBrowserState] =
    useState<BrowserPushState>(initialBrowserState)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [customReminderMinutes, setCustomReminderMinutes] = useState('30')

  const statusQuery = usePushSubscriptionStatus(
    workspaceId,
    browserState.endpoint,
  )
  const salvarPushSubscription = useSalvarPushSubscription()
  const desativarPushSubscription = useDesativarPushSubscription()
  const atualizarPreferencias = useAtualizarPreferenciasPush()

  const status = statusQuery.data ?? null
  const isActive = Boolean(status?.flAtivo && browserState.endpoint)
  const canRequestPermission = canRequestPushPermission(browserState)
  const shouldShowIosInstallGuide =
    browserState.isIos && !browserState.isStandalone
  const reminderMinutes = status?.nrMinutosAntesEvento ?? 30
  const statusInfo = useMemo(
    () => getStatusInfo(browserState, status),
    [browserState, status],
  )

  useEffect(() => {
    let isMounted = true

    async function loadBrowserState() {
      const environment = getPushEnvironment()

      if (!environment.isSupported) {
        if (isMounted) {
          setBrowserState({ ...environment, endpoint: null, isLoading: false })
        }
        return
      }

      try {
        const subscription = await getExistingPushSubscription()

        if (isMounted) {
          setBrowserState({
            ...getPushEnvironment(),
            endpoint: subscription?.endpoint ?? null,
            isLoading: false,
          })
        }
      } catch {
        if (isMounted) {
          setBrowserState({ ...environment, endpoint: null, isLoading: false })
        }
      }
    }

    void loadBrowserState()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setCustomReminderMinutes(String(reminderMinutes))
  }, [reminderMinutes])

  async function refreshBrowserState() {
    const environment = getPushEnvironment()

    if (!environment.isSupported) {
      setBrowserState({ ...environment, endpoint: null, isLoading: false })
      return null
    }

    const subscription = await getExistingPushSubscription()
    setBrowserState({
      ...getPushEnvironment(),
      endpoint: subscription?.endpoint ?? null,
      isLoading: false,
    })

    return subscription
  }

  async function handleActivate() {
    setFeedback(null)
    setErro(null)
    let activationStep = 'validar suporte do navegador'

    try {
      if (!canRequestPermission) {
        throw new Error(statusInfo.description)
      }

      activationStep = 'ler chave publica VAPID'
      const vapidPublicKey = getVapidPublicKey()

      if (!vapidPublicKey) {
        throw new Error('VITE_VAPID_PUBLIC_KEY nao configurada.')
      }

      activationStep = 'registrar Service Worker'
      await registerServiceWorker()
      activationStep = 'solicitar permissao de notificacao'
      await requestNotificationPermission()

      activationStep = 'criar assinatura push no navegador'
      const subscription = await subscribeUserToPush(vapidPublicKey)
      activationStep = 'salvar assinatura push no Supabase'
      const savedStatus = await salvarPushSubscription.mutateAsync({
        subscription,
        workspaceId,
      })

      setBrowserState({
        ...getPushEnvironment(),
        endpoint: subscription.endpoint,
        isLoading: false,
      })

      if (savedStatus?.flAtivo) {
        setFeedback('Notificações ativadas neste dispositivo.')
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[DuoCal] Falha ao ativar notificacoes push.', {
          activationStep,
          browserState: getPushEnvironment(),
          rawError: getRawErrorMessage(error),
          workspaceId,
        })
      }

      setErro(getErrorMessage(error))
    }
  }

  async function handleDisable() {
    setFeedback(null)
    setErro(null)

    try {
      const subscription = await refreshBrowserState()
      const endpoint = subscription?.endpoint ?? browserState.endpoint

      if (!endpoint) {
        throw new Error('Nenhuma inscrição push encontrada neste dispositivo.')
      }

      if (subscription) {
        await subscription.unsubscribe()
      }

      await desativarPushSubscription.mutateAsync({ endpoint, workspaceId })
      setBrowserState({ ...getPushEnvironment(), endpoint: null, isLoading: false })
      setFeedback('Notificações desativadas neste dispositivo.')
    } catch (error) {
      setErro(getErrorMessage(error))
    }
  }

  async function handlePreferenceChange(
    patch: Partial<PushNotificationPreferences>,
  ) {
    if (!status) {
      return
    }

    setFeedback(null)
    setErro(null)

    try {
      await atualizarPreferencias.mutateAsync({
        workspaceId,
        pushSubscriptionId: status.pushSubscriptionId,
        flAlteracoesAgenda:
          patch.flAlteracoesAgenda ?? status.flAlteracoesAgenda,
        flConvites: patch.flConvites ?? status.flConvites,
        flEventos: patch.flEventos ?? status.flEventos,
        flLembretes: patch.flLembretes ?? status.flLembretes,
        nrMinutosAntesEvento:
          patch.nrMinutosAntesEvento ?? status.nrMinutosAntesEvento,
      })
      setFeedback('Preferências salvas.')
    } catch (error) {
      setErro(getErrorMessage(error))
    }
  }

  async function handleCustomReminderSubmit(event: FormEvent) {
    event.preventDefault()

    const parsedMinutes = Number(customReminderMinutes)

    if (!Number.isFinite(parsedMinutes)) {
      setErro('Informe um tempo de lembrete valido.')
      setFeedback(null)
      return
    }

    const minutes = Math.trunc(parsedMinutes)

    if (minutes < 5 || minutes > 1440) {
      setErro('Use um tempo entre 5 minutos e 24 horas.')
      setFeedback(null)
      return
    }

    setCustomReminderMinutes(String(minutes))
    await handlePreferenceChange({ nrMinutosAntesEvento: minutes })
  }

  const isBusy =
    salvarPushSubscription.isPending ||
    desativarPushSubscription.isPending ||
    atualizarPreferencias.isPending
  const activateButtonLabel = getActivateButtonLabel(browserState)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(17,20,74,0.36)] backdrop-blur-sm">
      <div
        className="duocal-constrained-width flex w-full flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_-16px_60px_rgba(17,20,74,0.14)]"
        style={{ maxHeight: 'min(90dvh, 720px)' }}
      >
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-(--duocal-border)" />
        </div>

        <div className="flex shrink-0 items-center justify-between border-b border-(--duocal-border) px-5 pt-2 pb-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-(--duocal-text)">
              Notificações
            </h2>
            <p className="text-xs font-semibold text-(--duocal-muted)">
              Lembretes neste dispositivo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-2xl bg-(--duocal-surface-soft) text-(--duocal-muted) transition hover:bg-[rgba(84,102,241,0.08)] hover:text-(--duocal-primary)"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4">
          <div className="space-y-4">
            {feedback ? (
              <FeedbackAlert
                message={feedback}
                onClose={() => setFeedback(null)}
                variant="success"
              />
            ) : null}

            {erro ? (
              <FeedbackAlert
                message={erro}
                onClose={() => setErro(null)}
                variant="error"
              />
            ) : null}

            <StatusCard
              browserState={browserState}
              isStatusLoading={statusQuery.isLoading}
              statusDescription={statusInfo.description}
              statusLabel={statusInfo.label}
              statusTone={statusInfo.tone}
            />

            {shouldShowIosInstallGuide ? (
              <IosInstallGuideCard />
            ) : null}

            {browserState.permission === 'denied' ? (
              <FeedbackAlert
                message="As notificações foram bloqueadas no navegador. Altere a permissão nas configurações do dispositivo para ativar novamente."
                title="Permissão bloqueada"
                variant="error"
              />
            ) : null}

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="size-4 text-(--duocal-primary)" />
                <h3 className="text-sm font-black text-(--duocal-text)">
                  Preferências
                </h3>
              </div>

              <div className="space-y-2">
                <PreferenceToggle
                  checked={status?.flEventos ?? true}
                  disabled={!isActive || isBusy}
                  label="Eventos"
                  onChange={(checked) =>
                    handlePreferenceChange({ flEventos: checked })
                  }
                />
                <PreferenceToggle
                  checked={status?.flLembretes ?? true}
                  disabled={!isActive || isBusy}
                  label="Lembretes"
                  onChange={(checked) =>
                    handlePreferenceChange({ flLembretes: checked })
                  }
                />
                <PreferenceToggle
                  checked={status?.flConvites ?? true}
                  disabled={!isActive || isBusy}
                  label="Convites"
                  onChange={(checked) =>
                    handlePreferenceChange({ flConvites: checked })
                  }
                />
                <PreferenceToggle
                  checked={status?.flAlteracoesAgenda ?? true}
                  disabled={!isActive || isBusy}
                  label="Alterações na agenda"
                  onChange={(checked) =>
                    handlePreferenceChange({ flAlteracoesAgenda: checked })
                  }
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4 text-(--duocal-primary)" />
                <h3 className="text-sm font-black text-(--duocal-text)">
                  Lembrete de evento
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {reminderShortcutMinutes.map((minutes) => (
                  <button
                    type="button"
                    key={minutes}
                    disabled={!isActive || isBusy}
                    onClick={() =>
                      handlePreferenceChange({
                        nrMinutosAntesEvento: minutes,
                      })
                    }
                    className="rounded-2xl border px-2 py-2 text-xs font-black transition disabled:opacity-60"
                    style={{
                      backgroundColor:
                        reminderMinutes === minutes
                          ? 'rgba(84,102,241,0.10)'
                          : '#fff',
                      borderColor:
                        reminderMinutes === minutes
                          ? 'var(--duocal-primary)'
                          : 'var(--duocal-border)',
                      color:
                        reminderMinutes === minutes
                          ? 'var(--duocal-primary)'
                          : 'var(--duocal-muted)',
                    }}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
              <form
                className="rounded-2xl border border-(--duocal-border) bg-white p-3"
                onSubmit={handleCustomReminderSubmit}
              >
                <label className="text-xs font-black uppercase tracking-[0.08em] text-(--duocal-muted)">
                  Personalizado
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="duocal-input h-11 min-w-0 flex-1"
                    disabled={!isActive || isBusy}
                    inputMode="numeric"
                    max={1440}
                    min={5}
                    onChange={(event) =>
                      setCustomReminderMinutes(event.target.value)
                    }
                    type="number"
                    value={customReminderMinutes}
                  />
                  <span className="shrink-0 text-xs font-bold text-(--duocal-muted)">
                    min
                  </span>
                  <Button
                    className="min-h-11 shrink-0 rounded-2xl px-4 text-xs"
                    disabled={!isActive || isBusy}
                    isLoading={atualizarPreferencias.isPending}
                    type="submit"
                    variant="secondary"
                  >
                    Salvar
                  </Button>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-(--duocal-muted)">
                  Entre 5 minutos e 24 horas antes do evento.
                </p>
              </form>
            </section>

            <div className="rounded-3xl border border-(--duocal-border) bg-(--duocal-surface-soft) p-4">
              <div className="flex gap-3">
                <Info className="mt-0.5 size-4 shrink-0 text-(--duocal-primary)" />
                <p className="text-xs leading-5 text-(--duocal-muted)">
                  O DuoCal usa uma inscrição separada para cada navegador ou
                  PWA instalado. Desativar aqui afeta apenas este dispositivo.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-(--duocal-border) px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {isActive ? (
            <Button
              className="w-full"
              icon={<BellOff className="size-4" />}
              isLoading={desativarPushSubscription.isPending}
              onClick={handleDisable}
              variant="danger"
            >
              Desativar neste dispositivo
            </Button>
          ) : (
            <Button
              className="w-full"
              disabled={!canRequestPermission || browserState.isLoading}
              icon={<Bell className="size-4" />}
              isLoading={salvarPushSubscription.isPending}
              onClick={handleActivate}
            >
              {activateButtonLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function IosInstallGuideCard() {
  return (
    <section className="overflow-hidden rounded-3xl border border-[rgba(255,176,32,0.26)] bg-white shadow-[0_14px_34px_rgba(17,20,74,0.08)]">
      <div className="h-1 w-full bg-(--duocal-warning)" />
      <div className="space-y-4 p-4">
        <div className="flex gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(255,176,32,0.14)] text-(--duocal-warning)">
            <Smartphone className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-(--duocal-text)">
              Instale o DuoCal no iPhone
            </h3>
            <p className="mt-1 text-sm leading-5 text-(--duocal-muted)">
              Para ativar notificações no iPhone, adicione o DuoCal à Tela de
              Início. No Safari, toque em Compartilhar e depois em Adicionar à
              Tela de Início. Depois abra o app pelo ícone criado.
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <IosInstallStep
            icon={<Share2 className="size-4" />}
            label="1. Toque em Compartilhar"
          />
          <IosInstallStep
            icon={<Home className="size-4" />}
            label="2. Escolha Adicionar à Tela de Início"
          />
          <IosInstallStep
            icon={<CheckCircle2 className="size-4" />}
            label="3. Abra pelo ícone do DuoCal"
          />
        </div>
      </div>
    </section>
  )
}

function IosInstallStep({
  icon,
  label,
}: {
  icon: ReactNode
  label: string
}) {
  return (
    <div className="flex min-h-11 items-center gap-3 rounded-2xl bg-(--duocal-surface-soft) px-3 text-sm font-bold text-(--duocal-text)">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-(--duocal-primary)">
        {icon}
      </span>
      <span className="min-w-0">{label}</span>
    </div>
  )
}

function StatusCard({
  browserState,
  isStatusLoading,
  statusDescription,
  statusLabel,
  statusTone,
}: {
  browserState: BrowserPushState
  isStatusLoading: boolean
  statusDescription: string
  statusLabel: string
  statusTone: 'danger' | 'muted' | 'primary' | 'success' | 'warning'
}) {
  const statusColor = {
    danger: 'var(--duocal-danger)',
    muted: 'var(--duocal-muted)',
    primary: 'var(--duocal-primary)',
    success: 'var(--duocal-success)',
    warning: 'var(--duocal-warning)',
  }[statusTone]

  return (
    <section className="rounded-3xl border border-(--duocal-border) bg-white p-4 shadow-[0_12px_30px_rgba(17,20,74,0.05)]">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[rgba(84,102,241,0.10)] text-(--duocal-primary)">
          {statusTone === 'success' ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Bell className="size-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-(--duocal-text)">
              Status do dispositivo
            </h3>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em]"
              style={{
                backgroundColor: `${statusColor}1A`,
                color: statusColor,
              }}
            >
              {isStatusLoading || browserState.isLoading
                ? 'Verificando'
                : statusLabel}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-(--duocal-muted)">
            {statusDescription}
          </p>
        </div>
      </div>
    </section>
  )
}

function PreferenceToggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-(--duocal-border) bg-white px-3 py-2.5 text-left transition disabled:opacity-60"
    >
      <span className="min-w-0 text-sm font-semibold text-(--duocal-text)">
        {label}
      </span>
      <span
        className="flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition"
        style={{
          backgroundColor: checked
            ? 'var(--duocal-primary)'
            : 'var(--duocal-border)',
          justifyContent: checked ? 'flex-end' : 'flex-start',
        }}
      >
        <span className="size-5 rounded-full bg-white shadow-[0_2px_6px_rgba(17,20,74,0.18)]" />
      </span>
    </button>
  )
}

function canRequestPushPermission(browserState: BrowserPushState) {
  return browserState.isSupported && browserState.permission !== 'denied'
}

function getActivateButtonLabel(browserState: BrowserPushState) {
  if (browserState.isLoading) {
    return 'Verificando...'
  }

  if (browserState.isIos && !browserState.isStandalone) {
    return 'Adicione à Tela de Início'
  }

  if (browserState.permission === 'denied') {
    return 'Permissão bloqueada'
  }

  if (!browserState.isSupported) {
    return 'Indisponível neste navegador'
  }

  return 'Ativar notificações'
}

function getStatusInfo(
  browserState: BrowserPushState,
  status: PushSubscriptionStatus | null,
) {
  if (browserState.isIos && !browserState.isStandalone) {
    return {
      description:
        'Para ativar notificações no iPhone, adicione o DuoCal à Tela de Início e abra pelo ícone criado.',
      label: 'Tela de Início',
      tone: 'warning' as const,
    }
  }

  if (browserState.isIos && !browserState.isSupported) {
    return {
      description:
        'No iPhone e iPad, as notificações exigem iOS/iPadOS 16.4 ou superior, app instalado e suporte a Service Worker, PushManager e Notification.',
      label: 'Atualize o iOS',
      tone: 'warning' as const,
    }
  }

  if (!browserState.isSupported) {
    return {
      description: buildUnsupportedMessage(browserState),
      label: 'Indisponível',
      tone: 'muted' as const,
    }
  }

  if (browserState.permission === 'denied') {
    return {
      description: 'A permissão foi bloqueada nas configurações do navegador.',
      label: 'Bloqueadas',
      tone: 'danger' as const,
    }
  }

  if (status?.flAtivo && browserState.endpoint) {
    return {
      description:
        'Este dispositivo está inscrito para receber lembretes do workspace.',
      label: 'Ativas',
      tone: 'success' as const,
    }
  }

  if (browserState.endpoint) {
    return {
      description:
        'Existe uma inscrição no navegador, mas ela está desativada no DuoCal.',
      label: 'Desativadas',
      tone: 'warning' as const,
    }
  }

  return {
    description:
      'Ative os lembretes para receber avisos mesmo quando o DuoCal estiver fechado.',
    label: 'Não ativadas',
    tone: 'primary' as const,
  }
}

function buildUnsupportedMessage(browserState: BrowserPushState) {
  const missing = [
    !browserState.hasServiceWorker ? 'Service Worker' : null,
    !browserState.hasPushManager ? 'PushManager' : null,
    !browserState.hasNotification ? 'Notification' : null,
  ].filter(Boolean)

  if (missing.length === 0) {
    return 'Este navegador não oferece suporte a Web Push.'
  }

  return `Este navegador não oferece suporte completo a Web Push. Recurso ausente: ${missing.join(', ')}.`
}
