import test from 'node:test'
import assert from 'node:assert/strict'
import { E164_RE, mascararTelefone, normalizarE164 } from '../src/lib/telefone.ts'
import { E164_RE as SERVIDOR_RE, normalizarE164 as normalizarServidor } from '../supabase/functions/_shared/notificacoes.ts'
import { codigoSchema, telefoneSchema } from '../src/lib/validacao.ts'

test('front e servidor normalizam o telefone da mesma forma', () => {
  assert.equal(E164_RE.source, SERVIDOR_RE.source)
  for (const entrada of ['(11) 99999-9999', '11999999999', '+55 11 99999 9999', '5511999999999', '+1 415 555 2671', 'abc', '119999', '']) {
    assert.equal(normalizarE164(entrada), normalizarServidor(entrada), entrada)
  }
  assert.equal(normalizarE164('(21) 98888-7777'), '+5521988887777')
})
test('máscara esconde o miolo e os schemas limitam tamanho e formato', () => {
  assert.equal(mascararTelefone('+5511999999999'), '+55 11 •••••-9999')
  assert.equal(mascararTelefone('+14155552671'), '+141 •••••-2671')
  assert.equal(telefoneSchema.safeParse({ numero: '11 9' }).success, false)
  assert.equal(telefoneSchema.safeParse({ numero: '(11) 99999-9999' }).success, true)
  assert.equal(codigoSchema.safeParse({ codigo: '12345' }).success, false)
  assert.equal(codigoSchema.safeParse({ codigo: '123456' }).success, true)
})
