import test from 'node:test'
import assert from 'node:assert/strict'
import { finalDaPlaca } from '../src/lib/calendario-veicular.ts'
import { veiculoSchema } from '../src/lib/validacao.ts'
import { LIMITE_VEICULOS, formatarPlaca, normalizarPlaca, placaValida } from '../src/lib/veiculos.ts'

test('normalizar: maiúsculas, sem hífen nem espaço', () => {
  assert.equal(normalizarPlaca('abc-1d23'), 'ABC1D23')
  assert.equal(normalizarPlaca(' abc 1234 '), 'ABC1234')
})

test('placaValida: Mercosul e antiga passam; tamanhos e posições erradas não', () => {
  for (const ok of ['ABC1D23', 'ABC1234', 'XYZ9A99']) assert.ok(placaValida(ok), ok)
  for (const ruim of ['ABC12345', 'AB1234', 'ABCD123', 'ABC1DE3', '1BC1D23', 'abc1d23', '']) assert.equal(placaValida(ruim), false, ruim)
})

test('formatarPlaca: antiga ganha hífen, Mercosul fica igual; final da placa continua certo', () => {
  assert.equal(formatarPlaca('ABC1234'), 'ABC-1234')
  assert.equal(formatarPlaca('ABC1D23'), 'ABC1D23')
  assert.equal(finalDaPlaca(formatarPlaca('ABC1234')), '4')
  assert.equal(finalDaPlaca('ABC1D23'), '3')
})

test('veiculoSchema espelha o CHECK: normaliza a placa, exige UF real, limita apelido', () => {
  const ok = veiculoSchema.safeParse({ placa: 'abc-1d23', uf: 'sp', apelido: ' carro da família ' })
  assert.equal(ok.success, true)
  assert.deepEqual(ok.data, { placa: 'ABC1D23', uf: 'SP', apelido: 'carro da família' })
  assert.equal(veiculoSchema.safeParse({ placa: 'ABC1234', uf: 'RJ' }).success, true)
  assert.equal(veiculoSchema.safeParse({ placa: 'ABC12345', uf: 'SP' }).success, false)
  assert.equal(veiculoSchema.safeParse({ placa: 'AB1234', uf: 'SP' }).success, false)
  assert.equal(veiculoSchema.safeParse({ placa: 'ABC1D23', uf: 'XX' }).success, false)
  assert.equal(veiculoSchema.safeParse({ placa: 'ABC1D23', uf: 'SP', apelido: 'x'.repeat(61) }).success, false)
  assert.equal(LIMITE_VEICULOS, 5)
})
