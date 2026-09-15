import test from 'node:test'
import assert from 'node:assert/strict'
import { parseConsent, shouldPrompt, buildConsent, CONSENT_VERSION } from '../src/lib/consent.ts'

test('sem registro salvo, o aviso aparece', () => {
  assert.equal(shouldPrompt(null), true)
  assert.equal(shouldPrompt(''), true)
})

test('aceite válido e atual dispensa o aviso', () => {
  const stored = JSON.stringify(buildConsent(new Date('2026-09-10T12:00:00Z')))
  assert.equal(shouldPrompt(stored), false)
})

test('aceite de versão anterior volta a pedir', () => {
  const stored = JSON.stringify({ v: CONSENT_VERSION - 1, at: '2026-01-01T00:00:00Z' })
  assert.equal(shouldPrompt(stored), true)
})

test('valor corrompido não derruba e reexibe o aviso', () => {
  assert.equal(parseConsent('{nope'), null)
  assert.equal(parseConsent('42'), null)
  assert.equal(shouldPrompt('{nope'), true)
})

test('buildConsent grava a versão atual e um timestamp ISO', () => {
  const record = buildConsent(new Date('2026-09-10T12:00:00Z'))
  assert.equal(record.v, CONSENT_VERSION)
  assert.equal(record.at, '2026-09-10T12:00:00.000Z')
})
