import test from 'node:test'
import assert from 'node:assert/strict'
import { anosValidadeCnh, idadeEm, validadeCnh } from '../src/lib/cnh.ts'

test('idade no exame considera se o aniversário já passou', () => {
  assert.equal(idadeEm('1976-09-21', '2026-09-20'), 49)
  assert.equal(idadeEm('1976-09-21', '2026-09-21'), 50)
  assert.equal(idadeEm('2000-02-29', '2026-02-28'), 25)
})
test('validade por faixa etária: 10, 5 e 3 anos (Lei 14.071/2020)', () => {
  assert.equal(anosValidadeCnh(49), 10)
  assert.equal(anosValidadeCnh(50), 5)
  assert.equal(anosValidadeCnh(69), 5)
  assert.equal(anosValidadeCnh(70), 3)
  assert.deepEqual(validadeCnh('1990-05-10', '2026-09-21'), { validade: '2036-09-21', anos: 10, idade: 36 })
  assert.deepEqual(validadeCnh('1976-09-21', '2026-09-21'), { validade: '2031-09-21', anos: 5, idade: 50 })
  assert.equal(validadeCnh('1950-01-01', '2026-02-28').validade, '2029-02-28')
})
