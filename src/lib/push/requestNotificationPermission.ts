export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    throw new Error('Notificacoes nao suportadas neste navegador.')
  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {
    throw new Error('Permissao de notificacao nao concedida.')
  }

  return permission
}
