import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PUSH_ENDPOINT_RE, ehIosSemPwa, pushSubscriptionSchema, suportaPush, urlBase64ToUint8Array } from '../src/lib/push.ts'
import { PUSH_ENDPOINT_RE as SERVIDOR_RE } from '../supabase/functions/_shared/notificacoes.ts'

test('allowlist de push é a mesma no front, no servidor e no CHECK da tabela', async () => {
  assert.equal(PUSH_ENDPOINT_RE.source, SERVIDOR_RE.source)
  const migration = await readFile(new URL('../supabase/migrations/20260922120000_push_subscriptions.sql', import.meta.url), 'utf8')
  const check = migration.match(/endpoint ~ '([^']+)'/)?.[1]
  assert.ok(check, 'CHECK do endpoint ausente na migration')
  // A regex do SQL usa escapes idênticos (sem as barras do literal JS).
  assert.equal(check, PUSH_ENDPOINT_RE.source.replace(/\\\//g, '/'))
})

test('assinatura válida passa; endpoint fora da allowlist e chaves curtas não', () => {
  const ok = pushSubscriptionSchema.safeParse({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) } })
  assert.equal(ok.success, true)
  assert.equal(pushSubscriptionSchema.safeParse({ endpoint: 'https://evil.example/x', keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) } }).success, false)
  assert.equal(pushSubscriptionSchema.safeParse({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', keys: { p256dh: 'curta', auth: 'a'.repeat(22) } }).success, false)
})

test('chave VAPID base64url vira bytes brutos', () => {
  const bytes = urlBase64ToUint8Array('AQID-_8')
  assert.deepEqual([...bytes], [1, 2, 3, 251, 255])
})

test('detecção de suporte e do iPhone sem PWA', () => {
  assert.equal(suportaPush({ hasServiceWorker: true, hasPushManager: true, hasNotification: true }), true)
  assert.equal(suportaPush({ hasServiceWorker: true, hasPushManager: false, hasNotification: true }), false)
  const ios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
  assert.equal(ehIosSemPwa(ios, false), true)
  assert.equal(ehIosSemPwa(ios, true), false)
  assert.equal(ehIosSemPwa('Mozilla/5.0 (X11; Linux x86_64) Chrome/120', false), false)
})
