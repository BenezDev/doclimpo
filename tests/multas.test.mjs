import test from 'node:test'
import assert from 'node:assert/strict'
import { CONSULTA_MULTAS_UF, FONTES_NACIONAIS } from '../src/data/consulta-multas-uf.ts'
import { UFS } from '../src/lib/calendario-veicular.ts'
import { PRAZOS_MULTA, REGRAS_PRAZO, ehPrazoMulta, linksConsultaMultas, sugerirPrazoMulta } from '../src/lib/multas.ts'

test('prazo mínimo legal: defesa e recurso = 30 dias da notificação; desconto vem impresso', () => {
  assert.deepEqual(sugerirPrazoMulta('defesa', '2026-09-01'), { data: '2026-10-01', dias: 30, base: REGRAS_PRAZO.defesa.base })
  assert.equal(sugerirPrazoMulta('recurso', '2026-12-15')?.data, '2027-01-14')
  assert.equal(sugerirPrazoMulta('desconto', '2026-09-01'), null)
  assert.equal(sugerirPrazoMulta('defesa', '2026-02-30'), null)
  assert.equal(sugerirPrazoMulta('defesa', ''), null)
})

test('toda regra cita o CTB e todo prazo é conhecido', () => {
  for (const prazo of PRAZOS_MULTA) {
    assert.ok(ehPrazoMulta(prazo))
    assert.match(REGRAS_PRAZO[prazo].base, /^CTB, art\. /)
    assert.ok(REGRAS_PRAZO[prazo].rotulo.length > 0)
  }
  assert.equal(ehPrazoMulta('hacker'), false)
})

test('fontes: só gov.br em https, com data de consulta; UF sem entrada cai nas nacionais', () => {
  for (const fonte of [...Object.values(FONTES_NACIONAIS), ...Object.values(CONSULTA_MULTAS_UF)]) {
    assert.match(fonte.url, /^https:\/\/[a-z0-9.-]+\.gov\.br\//, fonte.rotulo)
    assert.match(fonte.verificadoEm, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(fonte.rotulo.length > 0)
  }
  for (const [uf, entrada] of Object.entries(CONSULTA_MULTAS_UF)) {
    assert.ok(UFS.includes(uf), uf)
    assert.equal(entrada.uf, uf)
  }
  const sp = linksConsultaMultas('SP')
  assert.equal(sp[0].url, CONSULTA_MULTAS_UF.SP?.url)
  assert.equal(sp.length, 3)
  const semUf = linksConsultaMultas(null)
  assert.equal(semUf.length, 2)
  assert.equal(semUf[0].url, FONTES_NACIONAIS.senatran.url)
  assert.deepEqual(linksConsultaMultas('XX'), semUf)
  assert.deepEqual(linksConsultaMultas('AC'), semUf)
})
