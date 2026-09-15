import test from 'node:test'
import assert from 'node:assert/strict'
import { escapeHtml } from '../supabase/functions/_shared/html.ts'
import { compararSegredo } from '../supabase/functions/_shared/seguranca.ts'
import { documentoSchema, enderecoSchema, TIPOS_DOCUMENTO } from '../src/lib/validacao.ts'

test('escapeHtml neutraliza tags e aspas', () => {
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;')
  assert.equal(escapeHtml(`a & "b" 'c'`), 'a &amp; &quot;b&quot; &#39;c&#39;')
  assert.equal(escapeHtml('sem nada especial'), 'sem nada especial')
})

test('compararSegredo: verdadeiro só quando idêntico; tamanho diferente é falso', () => {
  assert.equal(compararSegredo('s3cr3t-forte', 's3cr3t-forte'), true)
  assert.equal(compararSegredo('s3cr3t-forte', 's3cr3t-fortX'), false)
  assert.equal(compararSegredo('abc', 'abcd'), false)
  assert.equal(compararSegredo('', ''), true)
})

test('documentoSchema aceita válido e rejeita tipo forjado / apelido longo / data ruim', () => {
  assert.equal(documentoSchema.safeParse({ tipo: 'cnh', data_vencimento: '2026-05-01' }).success, true)
  assert.equal(documentoSchema.safeParse({ tipo: 'hacker', data_vencimento: '2026-05-01' }).success, false)
  assert.equal(documentoSchema.safeParse({ tipo: 'cnh', apelido: 'x'.repeat(81), data_vencimento: '2026-05-01' }).success, false)
  assert.equal(documentoSchema.safeParse({ tipo: 'cnh', data_vencimento: '01/05/2026' }).success, false)
})

test('enderecoSchema exige cidade+UF e limita tamanhos', () => {
  assert.equal(enderecoSchema.safeParse({ cidade: 'São Paulo', uf: 'SP' }).success, true)
  assert.equal(enderecoSchema.safeParse({ cidade: 'São Paulo', uf: 'S' }).success, false)
  assert.equal(enderecoSchema.safeParse({ cidade: '', uf: 'SP' }).success, false)
  assert.equal(enderecoSchema.safeParse({ cidade: 'x'.repeat(81), uf: 'SP' }).success, false)
})

test('TIPOS_DOCUMENTO cobre os 9 tipos pessoais + 3 empresariais do plano MEI', () => {
  assert.equal(TIPOS_DOCUMENTO.length, 12)
  for (const tipo of ['cnh', 'outro', 'alvara', 'certidao', 'das_mei']) assert.ok(TIPOS_DOCUMENTO.includes(tipo), tipo)
  assert.equal(documentoSchema.safeParse({ tipo: 'das_mei', data_vencimento: '2026-12-20' }).success, true)
})
