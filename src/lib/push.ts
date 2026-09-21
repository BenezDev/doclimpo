// Web Push no navegador: suporte, chave do servidor e validação da assinatura
// antes de gravá-la. Lógica pura; quem toca em navigator/PushManager é a
// página (Conta), dentro de effects e handlers.

import { z } from 'zod'

// Serviços de push conhecidos. Cópia exata da regex do servidor
// (supabase/functions/_shared/notificacoes.ts) e do CHECK da tabela
// push_subscriptions; o teste garante que os três não divergem.
export const PUSH_ENDPOINT_RE =
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)\//

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().max(1024).regex(PUSH_ENDPOINT_RE, 'Serviço de push não suportado.'),
  keys: z.object({
    p256dh: z.string().min(80).max(100),
    auth: z.string().min(20).max(30),
  }),
})

export type PushSubscriptionJson = z.infer<typeof pushSubscriptionSchema>

// Chave pública VAPID (base64url) no formato que PushManager.subscribe aceita.
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export interface AmbientePush {
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
}

export function suportaPush(ambiente: AmbientePush): boolean {
  return ambiente.hasServiceWorker && ambiente.hasPushManager && ambiente.hasNotification
}

// No iPhone/iPad o push só existe com o site instalado na Tela de Início (iOS 16.4+).
export function ehIosSemPwa(userAgent: string, standalone: boolean): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent) && !standalone
}
