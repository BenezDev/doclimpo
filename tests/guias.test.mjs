import test from 'node:test'
import assert from 'node:assert/strict'
import { CALCULADORAS, GUIAS, calculadoraPorPath, guiaPorSlug } from '../src/lib/guias.ts'
import { documentIntent } from '../src/lib/public-content.ts'
import { publicPages, structuredData } from '../src/lib/page-meta.ts'

test('guias: título e descrição únicos, curtos e sem caracteres que o build escapa', () => {
  assert.equal(GUIAS.length, 4)
  assert.equal(new Set(GUIAS.map(guia => guia.slug)).size, GUIAS.length)
  for (const guia of GUIAS) {
    assert.match(guia.slug, /^[a-z]+(-[a-z]+)*$/, guia.slug)
    assert.doesNotMatch(guia.titulo, /[&<>"']/, guia.slug)
    assert.doesNotMatch(guia.descricao, /[&<>"']/, guia.slug)
    assert.ok(guia.descricao.length <= 160, `${guia.slug}: descrição longa (${guia.descricao.length})`)
    assert.equal(documentIntent(`?documento=${guia.tipo}`), guia.tipo, guia.slug)
    assert.ok(guia.secoes.length >= 3 && guia.faqs.length >= 3, guia.slug)
    assert.equal(publicPages[`/guias/${guia.slug}`]?.index, true, guia.slug)
  }
})

test('guias só citam fonte oficial, com data da consulta, e toda regra aponta o artigo', () => {
  for (const guia of GUIAS) {
    assert.ok(guia.fontes.length >= 1, guia.slug)
    for (const fonte of guia.fontes) {
      assert.match(fonte.url, /^https:\/\/([a-z0-9-]+\.)*(gov\.br)\//, fonte.url)
      assert.match(fonte.verificadoEm, /^\d{4}-\d{2}-\d{2}$/)
    }
    const texto = guia.secoes.flatMap(secao => secao.paragrafos).join(' ')
    assert.match(texto, /CTB, art\. \d+/, `${guia.slug} sem artigo do CTB`)
  }
  // Renovação automática: a lei (15.428/2026) manteve o exame médico.
  const cnh = guiaPorSlug('cnh-vencida')
  assert.match(JSON.stringify(cnh), /exame médico continua obrigatório/)
  assert.equal(guiaPorSlug('inexistente'), null)
})

test('calculadoras têm página indexável, FAQ e dados estruturados com trilha até Guias', () => {
  assert.equal(CALCULADORAS.length, 2)
  for (const calculadora of CALCULADORAS) {
    assert.equal(publicPages[calculadora.path]?.index, true, calculadora.path)
    assert.equal(calculadoraPorPath(calculadora.path), calculadora)
    const [bloco] = structuredData(calculadora.path)
    const tipos = bloco['@graph'].map(item => item['@type'])
    assert.deepEqual(tipos, ['Organization', 'BreadcrumbList', 'FAQPage'])
    assert.equal(bloco['@graph'][1].itemListElement[1].item, 'https://www.doclimpo.com/guias')
  }
  const [guia] = structuredData('/guias/prazos-da-multa')
  assert.deepEqual(guia['@graph'].map(item => item['@type']), ['Organization', 'BreadcrumbList', 'Article', 'FAQPage'])
})
