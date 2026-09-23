#!/usr/bin/env node
// Cria na Cakto os três produtos de assinatura do DocLimpo (um por plano, com
// oferta mensal recorrente) e o webhook que aponta para a Edge Function
// cakto-webhook. No fim imprime o comando para gravar os segredos no Supabase.
// Idempotente: produto com o mesmo nome e webhook com a mesma URL são
// reaproveitados, e a oferta é reajustada para o preço do catálogo.
//
// As chaves ficam só no seu shell — nunca no repositório:
//   CAKTO_CLIENT_ID=... CAKTO_CLIENT_SECRET=... node scripts/cakto-provisionar.mjs              # mostra o que faria
//   CAKTO_CLIENT_ID=... CAKTO_CLIENT_SECRET=... node scripts/cakto-provisionar.mjs --confirmar  # executa
//
// Chave de API: painel Cakto → Integrações → Cakto API, com os escopos
// read, write, products, offers, webhooks e subscriptions.

import { PLANOS } from '../src/lib/planos.ts'
import { EVENTOS_TRATADOS } from '../supabase/functions/_shared/cakto-eventos.ts'

const API = 'https://api.cakto.com.br/public_api'
const PROJETO = 'zgpixmunvgnwgzzfwpjg'
const APP_URL = process.env.APP_URL ?? 'https://www.doclimpo.com'
const WEBHOOK_URL = process.env.CAKTO_WEBHOOK_URL ?? `https://${PROJETO}.supabase.co/functions/v1/cakto-webhook`
const CONFIRMAR = process.argv.includes('--confirmar')
const ENV_DO_PLANO = { INDIVIDUAL: 'CAKTO_OFFER_INDIVIDUAL', FAMILIAR: 'CAKTO_OFFER_FAMILIAR', MEI: 'CAKTO_OFFER_MEI' }

const { CAKTO_CLIENT_ID, CAKTO_CLIENT_SECRET } = process.env
if (!CAKTO_CLIENT_ID || !CAKTO_CLIENT_SECRET) {
  console.error('Defina CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET no ambiente (painel Cakto → Integrações → Cakto API).')
  process.exit(1)
}

const tokenResposta = await fetch(`${API}/token/`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: CAKTO_CLIENT_ID, client_secret: CAKTO_CLIENT_SECRET }),
})
if (!tokenResposta.ok) throw new Error(`Token Cakto: HTTP ${tokenResposta.status} ${await tokenResposta.text()}`)
const { access_token: token, scope } = await tokenResposta.json()
console.log(`Autenticado na Cakto (escopos: ${scope}).${CONFIRMAR ? '' : ' Modo simulação: nada será criado sem --confirmar.'}\n`)

async function api(metodo, caminho, corpo) {
  const resposta = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  })
  const texto = await resposta.text()
  if (!resposta.ok) throw new Error(`${metodo} ${caminho}: HTTP ${resposta.status} ${texto}`)
  return texto ? JSON.parse(texto) : null
}

async function listarTudo(caminho) {
  const itens = []
  for (let pagina = 1; ; pagina++) {
    const resposta = await api('GET', `${caminho}?limit=100&page=${pagina}`)
    itens.push(...(resposta.results ?? []))
    if (!resposta.next) return itens
  }
}

const reais = centavos => (centavos / 100).toFixed(2)
const produtos = await listarTudo('/products/')
const ofertas = await listarTudo('/offers/')
const segredos = {}
const produtosIds = []

for (const plano of PLANOS) {
  const nome = `DocLimpo ${plano.nome}`
  let produto = produtos.find(p => p.name === nome && p.status !== 'deleted')

  if (!produto) {
    console.log(`• ${nome}: criar produto de assinatura (R$ ${reais(plano.precoCentavos)}/mês)`)
    if (!CONFIRMAR) continue
    produto = await api('POST', '/products/', {
      name: nome,
      description: plano.descricao,
      price: reais(plano.precoCentavos),
      currency: 'BRL',
      type: 'subscription',
      salesPage: APP_URL,
    })
    ofertas.push(...(await listarTudo('/offers/')).filter(o => o.product === produto.id))
  } else {
    console.log(`• ${nome}: produto já existe (${produto.id})`)
  }
  produtosIds.push(produto.id)

  // Criar o produto já cria a oferta padrão (e o checkout). Ela é que vira o
  // link pay.cakto.com.br/<id>; aqui garantimos preço e recorrência mensal sem fim.
  const oferta = ofertas.find(o => o.product === produto.id && o.default) ?? ofertas.find(o => o.product === produto.id)
  if (!oferta) throw new Error(`Produto ${produto.id} sem oferta — confira no painel da Cakto.`)
  const esperado = {
    name: nome,
    price: plano.precoCentavos / 100,
    currency: 'BRL',
    type: 'subscription',
    intervalType: 'month',
    interval: 1,
    recurrence_period: 30,
    quantity_recurrences: -1,
    trial_days: 0,
  }
  const divergente = Object.entries(esperado).some(([chave, valor]) => oferta[chave] !== valor)
  if (divergente) {
    console.log(`  oferta ${oferta.id}: ajustar para mensal recorrente, R$ ${reais(plano.precoCentavos)}`)
    if (CONFIRMAR) await api('PUT', `/offers/${encodeURIComponent(oferta.id)}/`, { ...esperado, product: produto.id })
  } else {
    console.log(`  oferta ${oferta.id}: ok`)
  }
  if (produto.status && produto.status !== 'active') console.log(`  atenção: produto com status "${produto.status}" — finalize a configuração no painel da Cakto.`)
  segredos[ENV_DO_PLANO[plano.id]] = oferta.id
}

const webhooks = await listarTudo('/webhook/')
let webhook = webhooks.find(w => w.url === WEBHOOK_URL)
const configWebhook = { name: 'DocLimpo', url: WEBHOOK_URL, products: produtosIds, events: [...EVENTOS_TRATADOS] }
if (!webhook) {
  console.log(`\n• Webhook → ${WEBHOOK_URL}: criar (${EVENTOS_TRATADOS.size} eventos)`)
  if (CONFIRMAR) webhook = await api('POST', '/webhook/', configWebhook)
} else {
  console.log(`\n• Webhook ${webhook.id} → ${WEBHOOK_URL}: atualizar produtos e eventos`)
  if (CONFIRMAR) webhook = await api('PUT', `/webhook/${webhook.id}/`, configWebhook)
}

if (!CONFIRMAR) {
  console.log('\nNada foi criado. Rode de novo com --confirmar para aplicar.')
  process.exit(0)
}

const segredoWebhook = webhook?.fields?.secret
if (segredoWebhook) segredos.CAKTO_WEBHOOK_SECRET = segredoWebhook
else console.log(`\nNão achei o segredo em webhook.fields (${JSON.stringify(Object.keys(webhook?.fields ?? {}))}). Copie-o do painel da Cakto (Integrações → Webhooks).`)

console.log('\nGrave os segredos nas Edge Functions (o client_id/secret são os mesmos desta execução):\n')
console.log(`supabase secrets set --project-ref ${PROJETO} \\`)
for (const [chave, valor] of Object.entries(segredos)) console.log(`  ${chave}=${valor} \\`)
console.log('  CAKTO_CLIENT_ID="$CAKTO_CLIENT_ID" CAKTO_CLIENT_SECRET="$CAKTO_CLIENT_SECRET"')
console.log('\nOu cole cada valor no painel do Supabase → Edge Functions → Secrets. Não comite esses valores.')
