import test from 'node:test'
import assert from 'node:assert/strict'
import { DOCUMENTOS_PUBLICOS, documentoPublicoPorSlug } from '../src/lib/documentos-publicos.ts'
import { documentIntent } from '../src/lib/public-content.ts'
import { publicPages } from '../src/lib/page-meta.ts'

test('11 documentos pessoais com título e descrição únicos e sem caracteres que o build escapa', () => {
  assert.equal(DOCUMENTOS_PUBLICOS.length, 11)
  const descricoes = new Set(DOCUMENTOS_PUBLICOS.map(item => item.descricao))
  assert.equal(descricoes.size, DOCUMENTOS_PUBLICOS.length)
  for (const item of DOCUMENTOS_PUBLICOS) {
    assert.doesNotMatch(item.titulo, /[&<>"']/, item.slug)
    assert.doesNotMatch(item.descricao, /[&<>"']/, item.slug)
    assert.ok(item.descricao.length <= 160, `${item.slug}: descrição longa (${item.descricao.length})`)
    assert.equal(item.faqs.length, 3, item.slug)
    assert.equal(documentIntent(`?documento=${item.slug}`), item.slug, `${item.slug} fora do allowlist de ?documento=`)
    assert.equal(publicPages[`/documentos/${item.slug}`]?.index, true, `${item.slug} sem page-meta indexável`)
  }
  assert.equal(documentoPublicoPorSlug('cnh')?.autoridade.orgao, 'Detran')
  assert.equal(documentoPublicoPorSlug('xyz'), null)
})
