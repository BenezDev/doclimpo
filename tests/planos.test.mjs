import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LIMITE_DOCUMENTOS_FREE, LIMITE_PESSOAS_FAMILIA, PLANOS, PLAN_TYPES,
  ehPago, formatarPreco, normalizarPlano, planoPorId, planoPorSlug, podeAdicionarDocumento, rotuloPlano, urlStripeSegura,
} from '../src/lib/planos.ts'
import {
  assinaturaAtiva, mapaDePrecos, origemPermitida, planoDoPrice, priceDoPlano, resumirAssinatura, resumirFatura, statusLocal,
} from '../supabase/functions/_shared/stripe-eventos.ts'

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

const env = { STRIPE_PRICE_INDIVIDUAL: 'price_ind', STRIPE_PRICE_FAMILIAR: 'price_fam', STRIPE_PRICE_MEI: 'price_mei' }

test('price vem do ambiente pelo slug; slug desconhecido ou env vazia não resolve', () => {
  assert.equal(priceDoPlano('individual', env), 'price_ind')
  assert.equal(priceDoPlano('familia', env), 'price_fam')
  assert.equal(priceDoPlano('mei', env), 'price_mei')
  assert.equal(priceDoPlano('premium', env), null)
  assert.equal(priceDoPlano('individual', {}), null)
  const mapa = mapaDePrecos(env)
  assert.equal(planoDoPrice('price_fam', mapa), 'FAMILIAR')
  assert.equal(planoDoPrice('price_forjado', mapa), null)
  assert.equal(planoDoPrice(null, mapa), null)
})

test('assinatura: só active/trialing/past_due dão plano; cancelada rebaixa a FREE', () => {
  const mapa = mapaDePrecos(env)
  const base = { id: 'sub_1', customer: 'cus_1', metadata: { user_id: 'u1' }, items: { data: [{ price: { id: 'price_mei' }, current_period_end: 1_800_000_000 }] } }
  const ativa = resumirAssinatura({ ...base, status: 'active' }, mapa)
  assert.equal(ativa.planoEfetivo, 'MEI')
  assert.equal(ativa.status, 'ACTIVE')
  assert.equal(ativa.usuarioIdMetadata, 'u1')
  assert.equal(ativa.autoRenova, true)
  assert.equal(ativa.fimPeriodo, new Date(1_800_000_000 * 1000).toISOString())
  const cancelada = resumirAssinatura({ ...base, status: 'canceled', cancel_at_period_end: true }, mapa)
  assert.equal(cancelada.planoEfetivo, 'FREE')
  assert.equal(cancelada.status, 'CANCELED')
  assert.equal(cancelada.autoRenova, false)
  const precoDesconhecido = resumirAssinatura({ ...base, status: 'active', items: { data: [{ price: { id: 'price_x' } }] } }, mapa)
  assert.equal(precoDesconhecido.planoEfetivo, 'FREE')
  assert.equal(assinaturaAtiva('past_due'), true)
  assert.equal(assinaturaAtiva('unpaid'), false)
  assert.equal(statusLocal('trialing'), 'TRIAL')
  assert.equal(statusLocal('qualquer'), 'UNKNOWN')
  assert.equal(resumirAssinatura({ ...base, status: 'active', customer: { id: 'cus_obj' } }, mapa).stripeCustomerId, 'cus_obj')
})

test('fatura: paga grava amount_paid como PAID; falha grava amount_due como FAILED', () => {
  const paga = resumirFatura({ id: 'in_1', customer: 'cus_1', amount_paid: 990, currency: 'brl', hosted_invoice_url: 'https://stripe.test/in_1', subscription: 'sub_1' }, 'invoice.paid')
  assert.deepEqual(paga, { stripePaymentId: 'in_1', stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1', valor: 9.9, moeda: 'BRL', status: 'PAID', urlFatura: 'https://stripe.test/in_1' })
  const falhou = resumirFatura({ id: 'in_2', customer: { id: 'cus_1' }, amount_due: 2989, subscription: null }, 'invoice.payment_failed')
  assert.equal(falhou.status, 'FAILED')
  assert.equal(falhou.valor, 29.89)
  assert.equal(falhou.stripeSubscriptionId, null)
  assert.equal(falhou.urlFatura, null)
})

test('redirecionamentos do Checkout só para o app ou o dev local (sem open redirect)', () => {
  assert.equal(origemPermitida('https://docalert.com.br', 'https://docalert.com.br'), 'https://docalert.com.br')
  assert.equal(origemPermitida('http://localhost:5173', 'https://docalert.com.br'), 'http://localhost:5173')
  assert.equal(origemPermitida('https://evil.test', 'https://docalert.com.br'), 'https://docalert.com.br')
  assert.equal(origemPermitida(null, 'https://docalert.com.br'), 'https://docalert.com.br')
})

test('só seguimos para o Stripe: qualquer outro host ou http vira null', () => {
  assert.equal(urlStripeSegura('https://checkout.stripe.com/c/pay/cs_test_123'), 'https://checkout.stripe.com/c/pay/cs_test_123')
  assert.equal(urlStripeSegura('https://billing.stripe.com/p/session/abc'), 'https://billing.stripe.com/p/session/abc')
  assert.equal(urlStripeSegura('https://evil.test/stripe.com'), null)
  assert.equal(urlStripeSegura('https://stripe.com.evil.test/'), null)
  assert.equal(urlStripeSegura('http://checkout.stripe.com/x'), null)
  assert.equal(urlStripeSegura('javascript:alert(1)'), null)
  assert.equal(urlStripeSegura(undefined), null)
})
