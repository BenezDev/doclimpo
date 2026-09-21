import test from 'node:test'
import assert from 'node:assert/strict'
import { CANAIS_PAGOS, PLANOS, WHATSAPP_DISPONIVEL, canaisDoPlano } from '../src/lib/planos.ts'
import { canaisParaUsuario, classificarErroMeta, higienizarTexto, normalizarE164, PUSH_ENDPOINT_RE, rotuloDocumento, textoAlerta } from '../supabase/functions/_shared/notificacoes.ts'

test('grátis só e-mail; pagos ganham push e, com o interruptor, WhatsApp', () => {
  assert.deepEqual(canaisDoPlano('FREE'), ['EMAIL'])
  for (const plano of ['INDIVIDUAL', 'MEI', 'FAMILIAR']) {
    const canais = canaisDoPlano(plano)
    assert.ok(canais.includes('PUSH'))
    assert.equal(canais.includes('WHATSAPP'), WHATSAPP_DISPONIVEL)
  }
  assert.deepEqual([...CANAIS_PAGOS], ['PUSH', 'WHATSAPP'])
})

test('com o WhatsApp desligado, nenhum benefício promete WhatsApp', () => {
  if (WHATSAPP_DISPONIVEL) return
  for (const plano of PLANOS) for (const item of plano.beneficios) assert.doesNotMatch(item, /whatsapp/i, `${plano.id}: ${item}`)
})

test('servidor: canais por usuário respeitam plano, preferências e dispositivos', () => {
  const base = { plano: 'INDIVIDUAL', notificationEmail: true, notificationWhatsapp: true, whatsappVerificado: true, pushCount: 2 }
  assert.deepEqual(canaisParaUsuario(base), ['EMAIL', 'PUSH', 'WHATSAPP'])
  assert.deepEqual(canaisParaUsuario({ ...base, plano: 'FREE' }), ['EMAIL'])
  assert.deepEqual(canaisParaUsuario({ ...base, notificationEmail: false, pushCount: 0 }), ['WHATSAPP'])
  assert.deepEqual(canaisParaUsuario({ ...base, whatsappVerificado: false }), ['EMAIL', 'PUSH'])
  assert.deepEqual(canaisParaUsuario({ ...base, notificationWhatsapp: false, pushCount: 0 }), ['EMAIL'])
})

test('texto do alerta e rótulo higienizado', () => {
  assert.equal(textoAlerta(7, 'CNH').titulo, 'Seu CNH vence em 7 dias')
  assert.equal(textoAlerta(1, 'CNH').titulo, 'Seu CNH vence em 1 dia')
  assert.equal(textoAlerta(0, 'CNH').titulo, 'Seu CNH venceu')
  assert.equal(rotuloDocumento({ tipo: 'cnh', apelido: null }), 'CNH')
  assert.equal(rotuloDocumento({ tipo: 'garantia', apelido: null }), 'Garantia')
  assert.equal(rotuloDocumento({ tipo: 'cnh', apelido: 'Meu\n\tcarro    novo' }), 'Meu carro novo')
  assert.equal(higienizarTexto('x'.repeat(80), 10).length, 10)
})

test('E.164: normaliza formatos brasileiros e recusa lixo', () => {
  assert.equal(normalizarE164('(11) 99999-9999'), '+5511999999999')
  assert.equal(normalizarE164('11999999999'), '+5511999999999')
  assert.equal(normalizarE164('+55 11 99999 9999'), '+5511999999999')
  assert.equal(normalizarE164('5511999999999'), '+5511999999999')
  assert.equal(normalizarE164('abc'), null)
  assert.equal(normalizarE164('+0123'), null)
})

test('allowlist de endpoints de push e classificação de erros da Meta', () => {
  assert.ok(PUSH_ENDPOINT_RE.test('https://fcm.googleapis.com/fcm/send/abc'))
  assert.ok(PUSH_ENDPOINT_RE.test('https://web.push.apple.com/QWxs'))
  assert.ok(PUSH_ENDPOINT_RE.test('https://wns2-par02p.notify.windows.com/w/?token=x'))
  assert.ok(!PUSH_ENDPOINT_RE.test('https://evil.example/fcm.googleapis.com/'))
  assert.ok(!PUSH_ENDPOINT_RE.test('http://fcm.googleapis.com/x'))
  assert.equal(classificarErroMeta(131026, 400), 'desativar')
  assert.equal(classificarErroMeta(130429, 429), 'retentar')
  assert.equal(classificarErroMeta(190, 401), 'configuracao')
  assert.equal(classificarErroMeta(undefined, 503), 'retentar')
  assert.equal(classificarErroMeta(999999, 400), 'falha')
})
