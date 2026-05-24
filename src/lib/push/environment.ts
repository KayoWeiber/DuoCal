export type PushPermissionState = NotificationPermission | 'unsupported'

export type PushEnvironment = {
  hasNotification: boolean
  hasPushManager: boolean
  hasServiceWorker: boolean
  isIos: boolean
  isStandalone: boolean
  isSupported: boolean
  permission: PushPermissionState
}

export function getPushEnvironment(): PushEnvironment {
  const hasWindow = typeof window !== 'undefined'
  const hasNavigator = typeof navigator !== 'undefined'
  const hasNotification = hasWindow && 'Notification' in window
  const hasServiceWorker = hasNavigator && 'serviceWorker' in navigator
  const hasPushManager = hasWindow && 'PushManager' in window
  const isIos = isIosDevice()
  const isStandalone = isStandalonePwa()
  const isSupported =
    hasNotification &&
    hasServiceWorker &&
    hasPushManager &&
    (!isIos || isStandalone)

  return {
    hasNotification,
    hasPushManager,
    hasServiceWorker,
    isIos,
    isStandalone,
    isSupported,
    permission: hasNotification ? Notification.permission : 'unsupported',
  }
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const platform = navigator.platform.toLowerCase()
  const userAgent = navigator.userAgent.toLowerCase()
  const iPadDesktopMode =
    platform === 'macintel' && navigator.maxTouchPoints > 1

  return /iphone|ipad|ipod/.test(userAgent) || iPadDesktopMode
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') {
    return false
  }

  const standaloneNavigator = navigator as Navigator & {
    standalone?: boolean
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    standaloneNavigator.standalone === true
  )
}

export function getVapidPublicKey() {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
}
