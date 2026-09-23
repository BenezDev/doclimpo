import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LIMITE_DOCUMENTOS_FREE, LIMITE_PESSOAS_FAMILIA, PLANOS, PLAN_TYPES,
  ehPago, formatarPreco, normalizarPlano, planoPorId, planoPorSlug, podeAdicionarDocumento, rotuloPlano, urlCheckoutSegura,
} from '../src/lib/planos.ts'

test('catálogo: três planos pagos com os preços combinados e Individual em destaque', () => {
  assert.deepEqual(PLANOS.map(p => [p.id, p.precoCentavos]), [['INDIVIDUAL', 990], ['MEI', 1989], ['FAMILIAR', 2989]])
  assert.equal(PLANOS.filter(p => p.destaque).length, 1)
  assert.equal(planoPorSlug('individual')?.destaque, true)
  assert.equal(planoPorId('FAMILIAR')?.pessoas, LIMITE_PESSOAS_FAMILIA)
  assert.equal(LIMITE_PESSOAS_FAMILIA, 4)
  for (const plano of PLANOS) assert.ok(plano.beneficios.length >= 3)
})

test('formatarPreco usa vírgula e dois dígitos', () => {
  assert.equal(formatarPreco(990), 'R$ 9,90')
  assert.equal(formatarPreco(1989), 'R$ 19,89')
  assert.equal(formatarPreco(2989), 'R$ 29,89')
  assert.equal(formatarPreco(0), 'R$ 0,00')
})

test('FREE monitora 1 documento ativo; pagos são ilimitados; valor desconhecido vira FREE', () => {
  assert.equal(LIMITE_DOCUMENTOS_FREE, 1)
  assert.equal(podeAdicionarDocumento('FREE', 0), true)
  assert.equal(podeAdicionarDocumento('FREE', 1), false)
  for (const plano of ['INDIVIDUAL', 'FAMILIAR', 'MEI']) assert.equal(podeAdicionarDocumento(plano, 50), true)
  assert.equal(normalizarPlano('PRO'), 'FREE')
  assert.equal(normalizarPlano(null), 'FREE')
  assert.equal(normalizarPlano('MEI'), 'MEI')
  assert.equal(ehPago('FREE'), false)
  assert.deepEqual([...PLAN_TYPES], ['FREE', 'INDIVIDUAL', 'FAMILIAR', 'MEI'])
  assert.equal(rotuloPlano('FREE'), 'Plano gratuito')
  assert.equal(rotuloPlano('FAMILIAR'), 'Plano Família')
})

test('só seguimos para o checkout da Cakto: qualquer outro host ou http vira null', () => {
  assert.equal(urlCheckoutSegura('https://pay.cakto.com.br/a8BcHrY?callback=abc'), 'https://pay.cakto.com.br/a8BcHrY?callback=abc')
  assert.equal(urlCheckoutSegura('https://evil.test/pay.cakto.com.br'), null)
  assert.equal(urlCheckoutSegura('https://pay.cakto.com.br.evil.test/x'), null)
  assert.equal(urlCheckoutSegura('https://app.cakto.com.br/x'), null)
  assert.equal(urlCheckoutSegura('http://pay.cakto.com.br/x'), null)
  assert.equal(urlCheckoutSegura('javascript:alert(1)'), null)
  assert.equal(urlCheckoutSegura(undefined), null)
})
