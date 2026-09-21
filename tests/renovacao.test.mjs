import test from 'node:test'
import assert from 'node:assert/strict'
import { haversineKm, maisProximas } from '../src/lib/geo.ts'
import { autoridadePara, linkMapaFallback } from '../src/lib/renovacao.ts'
import { normalizarCep, cepValido, formatarCep } from '../src/lib/cep.ts'
import {
  resolverCoordenada,
  coordenadaDoUsuario,
  temEndereco,
  precisaPedirEndereco,
  melhorRenovacao,
} from '../src/lib/endereco.ts'

const SAO_PAULO = { lat: -23.5505, lng: -46.6333 }
const RIO = { lat: -22.9068, lng: -43.1729 }

test('haversine mede a distância SP↔RJ em ~360 km', () => {
  const d = haversineKm(SAO_PAULO, RIO)
  assert.ok(d > 340 && d < 380, `esperado ~360, veio ${d}`)
  assert.equal(haversineKm(SAO_PAULO, SAO_PAULO), 0)
})

test('maisProximas ordena por distância e limita a n', () => {
  const itens = [
    { id: 'rj', lat: RIO.lat, lng: RIO.lng },
    { id: 'sp', lat: -23.55, lng: -46.63 },
    { id: 'campinas', lat: -22.9099, lng: -47.0626 },
  ]
  const perto = maisProximas(SAO_PAULO, itens, 2)
  assert.equal(perto.length, 2)
  assert.equal(perto[0].id, 'sp')
  assert.equal(perto[1].id, 'campinas')
  assert.ok(perto[0].distanciaKm <= perto[1].distanciaKm)
})

test('autoridadePara mapeia documento -> órgão, com privados marcados', () => {
  assert.equal(autoridadePara('cnh').rede, 'detran')
  assert.equal(autoridadePara('passaporte').rede, 'pf')
  assert.equal(autoridadePara('rg').rede, 'identificacao')
  assert.equal(autoridadePara('seguro').privado, true)
  assert.equal(autoridadePara('plano_saude').privado, true)
  for (const tipo of ['garantia', 'contrato', 'exame']) assert.equal(autoridadePara(tipo).privado, true, tipo)
  assert.equal(autoridadePara('desconhecido').orgao, autoridadePara('outro').orgao)
})

test('linkMapaFallback gera busca no Google Maps localizada', () => {
  const url = linkMapaFallback('Poupatempo RG', { cidade: 'São Paulo', uf: 'SP' })
  assert.match(url, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/)
  assert.match(decodeURIComponent(url), /Poupatempo RG São Paulo SP/)
})

test('CEP: normaliza, valida e formata', () => {
  assert.equal(normalizarCep('01310-100'), '01310100')
  assert.equal(normalizarCep('abc01310100xyz'), '01310100')
  assert.equal(cepValido('01310-100'), true)
  assert.equal(cepValido('123'), false)
  assert.equal(formatarCep('01310100'), '01310-100')
})

test('resolverCoordenada: IBGE -> nome -> UF -> null', () => {
  assert.deepEqual(resolverCoordenada({ ibge: '3550308' }), { lat: -23.5505, lng: -46.6333 })
  // IBGE desconhecido, mas cidade+UF batem pelo nome
  const porNome = resolverCoordenada({ ibge: '9999999', cidade: 'Rio de Janeiro', uf: 'RJ' })
  assert.deepEqual(porNome, { lat: -22.9068, lng: -43.1729 })
  // Só UF -> centroide da UF
  assert.ok(resolverCoordenada({ uf: 'BA' }))
  // Nada -> null
  assert.equal(resolverCoordenada({ cidade: 'Narnia', uf: 'ZZ' }), null)
})

test('coordenadaDoUsuario prioriza lat/lng persistidos', () => {
  const coord = coordenadaDoUsuario({ latitude: -1.23, longitude: -4.56, ibge: '3550308' })
  assert.deepEqual(coord, { lat: -1.23, lng: -4.56 })
})

test('temEndereco / precisaPedirEndereco', () => {
  assert.equal(temEndereco(null), false)
  assert.equal(temEndereco({ cidade: 'São Paulo' }), true)
  assert.equal(precisaPedirEndereco(null, false), true)
  assert.equal(precisaPedirEndereco(null, true), false) // adiado
  assert.equal(precisaPedirEndereco({ cidade: 'São Paulo' }, false), false)
})

test('melhorRenovacao: passaporte em SP acha posto da PF próximo', () => {
  const r = melhorRenovacao('passaporte', { cidade: 'São Paulo', uf: 'SP', ibge: '3550308' })
  assert.equal(r.autoridade.rede, 'pf')
  assert.ok(r.unidades.length >= 1)
  assert.equal(r.unidades[0].uf, 'SP')
  assert.ok(r.unidades[0].distanciaKm < 20)
})

test('melhorRenovacao: RG no RJ não mostra Poupatempo de SP (fora do raio)', () => {
  const r = melhorRenovacao('rg', { cidade: 'Rio de Janeiro', uf: 'RJ', ibge: '3304557' })
  assert.equal(r.unidades.length, 0)
  assert.match(r.linkMapa, /google\.com\/maps/)
})

test('melhorRenovacao: documento privado não lista unidades', () => {
  const r = melhorRenovacao('seguro', { cidade: 'São Paulo', uf: 'SP' })
  assert.equal(r.autoridade.privado, true)
  assert.equal(r.unidades.length, 0)
})
