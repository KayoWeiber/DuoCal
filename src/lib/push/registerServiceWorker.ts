export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker nao suportado neste navegador.')
  }

  return navigator.serviceWorker.register('/service-worker.js')
}

export async function getExistingPushSubscription() {
  if (!('serviceWorker' in navigator)) {
    return null
  }

  await registerServiceWorker()
  const registration = await navigator.serviceWorker.ready

  if (!('pushManager' in registration)) {
    return null
  }

  return registration.pushManager.getSubscription()
}
