export type PushPermissionState = NotificationPermission | 'unsupported'

export type PushEnvironment = {
  isIos: boolean
  isStandalone: boolean
  isSupported: boolean
  permission: PushPermissionState
}

export function getPushEnvironment(): PushEnvironment {
  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  return {
    isIos: isIosDevice(),
    isStandalone: isStandalonePwa(),
    isSupported,
    permission: isSupported ? Notification.permission : 'unsupported',
  }
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') {
    return false
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent)
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
