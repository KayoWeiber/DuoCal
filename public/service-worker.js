try {
  importScripts('/sw.js')
} catch (error) {
  console.warn('[DuoCal] Workbox service worker nao carregado.', error)
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event)
  const title = payload.title || 'DuoCal'
  const options = {
    badge: '/duocal-icon.svg',
    body: payload.body || 'Voce tem uma nova notificacao.',
    data: {
      url: payload.url || '/notificacoes',
    },
    icon: '/duocal-icon.svg',
    tag: payload.tag || 'duocal-notification',
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = new URL(
    event.notification.data?.url || '/notificacoes',
    self.location.origin,
  ).href

  event.waitUntil(openOrFocusClient(targetUrl))
})

function readPushPayload(event) {
  if (!event.data) {
    return {}
  }

  try {
    return event.data.json()
  } catch {
    return {
      body: event.data.text(),
      title: 'DuoCal',
      url: '/notificacoes',
    }
  }
}

async function openOrFocusClient(targetUrl) {
  const clientList = await clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  })

  for (const client of clientList) {
    if ('focus' in client) {
      if ('navigate' in client) {
        await client.navigate(targetUrl)
      }

      return client.focus()
    }
  }

  return clients.openWindow(targetUrl)
}
