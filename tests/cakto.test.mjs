import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  assinaturaAtiva, assinaturaDoPedido, assinaturaWebhookValida, ehPlanoSlug, EVENTOS_QUE_ENCERRAM, EVENTOS_TRATADOS,
  ofertaDoPlano, pedidosDoEvento, planoDaOferta, resumirAssinatura, STATUS_COM_ACESSO, statusLocal, statusPagamento, urlCheckout,
} from '../supabase/functions/_shared/cakto-eventos.ts'

const env = { CAKTO_OFFER_INDIVIDUAL: 'ofInd', CAKTO_OFFER_FAMILIAR: ' ofFam ', CAKTO_OFFER_MEI: 'ofMei' }

test('oferta vem do ambiente pelo slug; slug desconhecido, herdado ou env vazia não resolve', () => {
  assert.equal(ofertaDoPlano('individual', env), 'ofInd')
  assert.equal(ofertaDoPlano('familia', env), 'ofFam')
  assert.equal(ofertaDoPlano('mei', env), 'ofMei')
  assert.equal(ofertaDoPlano('premium', env), null)
  assert.equal(ofertaDoPlano('toString', env), null)
  assert.equal(ofertaDoPlano('individual', {}), null)
  assert.equal(ehPlanoSlug('familia'), true)
  assert.equal(ehPlanoSlug('__proto__'), false)
  assert.equal(ehPlanoSlug(1), false)
  assert.equal(planoDaOferta('ofFam', env), 'FAMILIAR')
  assert.equal(planoDaOferta('ofForjada', env), null)
  assert.equal(planoDaOferta(undefined, env), null)
  assert.equal(planoDaOferta('', {}), null)
})

test('link do checkout: host fixo da Cakto e token só no ?callback=', () => {
  assert.equal(urlCheckout('a8BcHrY', 'tok-123'), 'https://pay.cakto.com.br/a8BcHrY?callback=tok-123')
  assert.equal(urlCheckout('../x', 'a b'), 'https://pay.cakto.com.br/..%2Fx?callback=a%20b')
})

test('assinatura: active/trial/late dão plano; cancelada, expirada, pausada ou sem plano conhecido viram FREE', () => {
  const ativa = resumirAssinatura({ id: 's1', status: 'active', next_payment_date: '2026-10-22T12:00:00-03:00' }, 'MEI')
  assert.deepEqual(ativa, {
    caktoSubscriptionId: 's1', plano: 'MEI', ativa: true, status: 'ACTIVE',
    fimPeriodo: '2026-10-22T12:00:00-03:00', autoRenova: true, planoEfetivo: 'MEI',
  })
  assert.equal(resumirAssinatura({ id: 's1', status: 'late' }, 'INDIVIDUAL').planoEfetivo, 'INDIVIDUAL')
  assert.equal(resumirAssinatura({ id: 's1', status: 'late' }, 'INDIVIDUAL').status, 'PAST_DUE')
  for (const status of ['canceled', 'expired', 'paused', 'inactive', 'qualquer']) {
    const resumo = resumirAssinatura({ id: 's1', status }, 'FAMILIAR')
    assert.equal(resumo.planoEfetivo, 'FREE', status)
    assert.equal(resumo.autoRenova, false, status)
  }
  assert.equal(resumirAssinatura({ id: 's1', status: 'active' }, null).planoEfetivo, 'FREE')
  assert.equal(resumirAssinatura({ id: 's1', status: 'active' }, null).fimPeriodo, null)
  // STATUS_COM_ACESSO (filtro no banco) é o espelho local de assinaturaAtiva.
  const comAcesso = ['active', 'trial', 'late', 'canceled', 'expired', 'paused', 'inactive'].filter(assinaturaAtiva).map(statusLocal)
  assert.deepEqual(comAcesso, [...STATUS_COM_ACESSO])
})

test('pagamentos: só paid/refused/refunded/chargedback viram linha em payments', () => {
  assert.equal(statusPagamento('paid'), 'PAID')
  assert.equal(statusPagamento('refused'), 'FAILED')
  assert.equal(statusPagamento('refunded'), 'REFUNDED')
  assert.equal(statusPagamento('chargedback'), 'CHARGEBACK')
  assert.equal(statusPagamento('waiting_payment'), null)
  assert.equal(statusPagamento(undefined), null)
  assert.equal(EVENTOS_QUE_ENCERRAM.has('refund') && EVENTOS_QUE_ENCERRAM.has('chargeback'), true)
  assert.equal(EVENTOS_TRATADOS.has('checkout_abandonment'), false)
  assert.equal(EVENTOS_TRATADOS.has('pix_gerado'), false)
})

test('webhook V1 (objeto) e V2 (lista); abandono de checkout e lixo não viram pedido', () => {
  const pedido = { id: 'o1', status: 'paid', subscription: { id: 'sub-1' }, callback: 'tok' }
  assert.deepEqual(pedidosDoEvento(pedido), [pedido])
  assert.deepEqual(pedidosDoEvento([pedido, { id: 'o2' }]).map(p => p.id), ['o1', 'o2'])
  assert.deepEqual(pedidosDoEvento({ customerEmail: 'a@b.c', checkoutUrl: 'x' }), [])
  assert.deepEqual(pedidosDoEvento(null), [])
  assert.deepEqual(pedidosDoEvento([{ id: '' }, 'x', 3]), [])
  assert.equal(assinaturaDoPedido(pedido), 'sub-1')
  assert.equal(assinaturaDoPedido({ id: 'o', subscription: 'sub-2' }), 'sub-2')
  assert.equal(assinaturaDoPedido({ id: 'o', subscription: null }), null)
  assert.equal(assinaturaDoPedido({ id: 'o', subscription: {} }), null)
})

const segredo = 'b3f1a9c2-7b4d-4a8e-9f01-2c6d5b8a4e37'
const corpo = '{"secret":"x","event":"purchase_approved","data":{"id":"o1"}}'
const assinar = (ts, texto = corpo, chave = segredo) => `v1=${createHmac('sha256', chave).update(`${ts}.${texto}`).digest('hex')}`

test('X-Cakto-Signature: HMAC do corpo cru com o segredo, dentro de 5 minutos', async () => {
  const agora = 1_790_000_000
  const ts = String(agora)
  assert.equal(await assinaturaWebhookValida(segredo, ts, corpo, assinar(ts), agora), true)
  assert.equal(await assinaturaWebhookValida(segredo, ts, corpo, `v2=abc, ${assinar(ts)}`, agora), true)
  assert.equal(await assinaturaWebhookValida(segredo, ts, corpo, assinar(ts), agora + 301), false)
  assert.equal(await assinaturaWebhookValida(segredo, ts, corpo + ' ', assinar(ts), agora), false)
  assert.equal(await assinaturaWebhookValida(segredo, ts, corpo, assinar(ts, corpo, 'outro'), agora), false)
  assert.equal(await assinaturaWebhookValida(segredo, ts, corpo, assinar(ts).replace('v1=', 'v2='), agora), false)
  assert.equal(await assinaturaWebhookValida(segredo, null, corpo, assinar(ts), agora), false)
  assert.equal(await assinaturaWebhookValida(segredo, '12a', corpo, assinar('12a'), agora), false)
  assert.equal(await assinaturaWebhookValida(segredo, ts, corpo, null, agora), false)
  assert.equal(await assinaturaWebhookValida('', ts, corpo, assinar(ts, corpo, ''), agora), false)
})
