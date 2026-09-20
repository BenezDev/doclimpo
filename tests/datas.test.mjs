import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dataValida, diasRestantes, formatarData, hojeISO, paraCompacto, paraISO, parseData, somarAnos, somarDias, statusPorDias } from '../src/lib/datas.ts'

test('parse por partes fica no fuso local (sem voltar um dia)', () => {
  const data = parseData('2026-03-01')
  assert.equal(data.getFullYear(), 2026)
  assert.equal(data.getMonth(), 2)
  assert.equal(data.getDate(), 1)
  assert.equal(paraISO(data), '2026-03-01')
})
test('dias restantes conta a partir da meia-noite local', () => {
  const agora = new Date(2026, 11, 30, 23, 59)
  assert.equal(diasRestantes('2026-12-31', agora), 1)
  assert.equal(diasRestantes('2026-12-30', agora), 0)
  assert.equal(diasRestantes('2026-12-29', agora), -1)
  assert.equal(hojeISO(agora), '2026-12-30')
})
test('formatação brasileira e compacta', () => {
  assert.equal(formatarData('2026-10-12'), '12/10/2026')
  assert.equal(paraCompacto('2026-10-12'), '20261012')
})
test('somar dias e anos respeita meses curtos e bissextos', () => {
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01')
  assert.equal(somarAnos('2028-02-29', 1), '2029-02-28')
  assert.equal(somarAnos('2026-10-12', 5), '2031-10-12')
})
test('status por dias usa os limiares 7 e 90', () => {
  assert.equal(statusPorDias(-1).id, 'vencido')
  assert.equal(statusPorDias(7).id, 'critico')
  assert.equal(statusPorDias(90).id, 'atencao')
  assert.equal(statusPorDias(91).id, 'vigente')
})
test('dataValida rejeita formato e dias inexistentes', () => {
  assert.equal(dataValida('2026-02-30'), false)
  assert.equal(dataValida('2026-2-3'), false)
  assert.equal(dataValida('2026-02-28'), true)
})
