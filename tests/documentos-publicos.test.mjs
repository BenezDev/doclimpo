import test from 'node:test'
import assert from 'node:assert/strict'
import { DOCUMENTOS_PUBLICOS, documentoPublicoPorSlug } from '../src/lib/documentos-publicos.ts'
import { documentIntent } from '../src/lib/public-content.ts'
import { publicPages } from '../src/lib/page-meta.ts'

test('12 documentos pessoais com título e descrição únicos e sem caracteres que o build escapa', () => {
  assert.equal(DOCUMENTOS_PUBLICOS.length, 12)
  const descricoes = new Set(DOCUMENTOS_PUBLICOS.map(item => item.descricao))
  assert.equal(descricoes.size, DOCUMENTOS_PUBLICOS.length)
  for (const item of DOCUMENTOS_PUBLICOS) {
    assert.doesNotMatch(item.titulo, /[&<>"']/, item.slug)
    assert.doesNotMatch(item.descricao, /[&<>"']/, item.slug)
    assert.ok(item.descricao.length <= 160, `${item.slug}: descrição longa (${item.descricao.length})`)
    assert.equal(item.faqs.length, 3, item.slug)
    assert.equal(documentIntent(`?documento=${item.tipo}`), item.tipo, `${item.tipo} fora do allowlist de ?documento=`)
    assert.match(item.slug, /^[a-z]+(-[a-z]+)*$/, `${item.slug}: slug com hífen, sem underline`)
    assert.match(item.cta, /^Acompanhar /, item.slug)
    assert.equal(publicPages[`/documentos/${item.slug}`]?.index, true, `${item.slug} sem page-meta indexável`)
  }
  assert.equal(documentoPublicoPorSlug('cnh')?.autoridade.orgao, 'Detran')
  assert.equal(documentoPublicoPorSlug('xyz'), null)
  // Multa: cabeçalho próprio (não é "validade/renovação") e canais oficiais fixos.
  const multa = documentoPublicoPorSlug('multa')
  assert.match(multa?.h1 ?? '', /^Multa de trânsito/)
  assert.equal(multa?.rotulos?.renovar, 'Onde consultar e pagar')
  assert.ok((multa?.links?.length ?? 0) >= 2)
  for (const fonte of multa?.links ?? []) assert.match(fonte.url, /^https:\/\/[a-z0-9.-]+\.gov\.br\//)
})
