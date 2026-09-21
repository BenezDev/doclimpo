// Service worker do DocLimpo: só notificações push. Sem cache, sem
// interceptar fetch — o app continua servido direto pela Vercel.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  let dados = {}
  try { dados = event.data ? event.data.json() : {} } catch { dados = {} }
  const titulo = typeof dados.title === 'string' ? dados.title : 'DocLimpo'
  const opcoes = {
    body: typeof dados.body === 'string' ? dados.body : '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: typeof dados.tag === 'string' ? dados.tag : undefined,
    data: { url: typeof dados.url === 'string' ? dados.url : '/dashboard' },
  }
  event.waitUntil(self.registration.showNotification(titulo, opcoes))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  // Só caminhos do próprio site: o servidor manda "/documento/<id>", nunca URL absoluta.
  const destino = new URL(event.notification.data?.url ?? '/dashboard', self.location.origin)
  if (destino.origin !== self.location.origin) return
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const aberta = janelas.find(janela => new URL(janela.url).origin === self.location.origin)
    if (aberta) {
      await aberta.focus()
      if ('navigate' in aberta) await aberta.navigate(destino.href)
      return
    }
    await self.clients.openWindow(destino.href)
  })())
})
