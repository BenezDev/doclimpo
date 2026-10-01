import test from 'node:test'
import assert from 'node:assert/strict'
import { TIPOS, TIPOS_DOCUMENTO, rotuloDoTipo, tiposDisponiveis } from '../src/lib/tipos-documento.ts'
import { TIPOS_DOCUMENTO as TIPOS_VALIDADOS } from '../src/lib/validacao.ts'
import { LABELS } from '../supabase/functions/_shared/notificacoes.ts'

const ids = TIPOS.map(tipo => tipo.id)

test('catálogo do front e LABELS do servidor têm exatamente os mesmos ids', () => {
  assert.deepEqual([...ids].sort(), Object.keys(LABELS).sort())
})

test('catálogo: ids únicos, rótulo e descrição preenchidos, validação usa os mesmos ids', () => {
  assert.equal(new Set(ids).size, ids.length)
  for (const tipo of TIPOS) {
    assert.ok(tipo.label.trim(), tipo.id)
    assert.ok(tipo.description.trim(), tipo.id)
  }
  assert.deepEqual([...TIPOS_DOCUMENTO], ids)
  assert.deepEqual([...TIPOS_VALIDADOS], ids)
})

test('tiposDisponiveis: empresariais só para o MEI', () => {
  const empresariais = ['alvara', 'certidao', 'das_mei']
  assert.deepEqual(TIPOS.filter(tipo => tipo.empresarial).map(tipo => tipo.id), empresariais)
  const pessoais = tiposDisponiveis(false).map(tipo => tipo.id)
  for (const id of empresariais) assert.ok(!pessoais.includes(id), id)
  assert.equal(pessoais.length, ids.length - empresariais.length)
  assert.deepEqual(tiposDisponiveis(true).map(tipo => tipo.id), ids)
})

test('rotuloDoTipo devolve o rótulo e, para tipo desconhecido, o próprio id', () => {
  assert.equal(rotuloDoTipo('multa'), 'Multa de trânsito')
  assert.equal(rotuloDoTipo('das_mei'), 'DAS-MEI')
  assert.equal(rotuloDoTipo('tipo_novo'), 'tipo_novo')
})
