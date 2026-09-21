import test from 'node:test'
import assert from 'node:assert/strict'
import { CALENDARIO_VEICULAR } from '../src/data/calendario-veicular.ts'
import { FINAIS_PLACA, UFS, finalDaPlaca, sugerirDataVeicular, ufsDisponiveis } from '../src/lib/calendario-veicular.ts'

test('toda entrada tem fonte oficial https, data de consulta e datas ISO do próprio ano', () => {
  for (const [ano, porUf] of Object.entries(CALENDARIO_VEICULAR)) {
    for (const [uf, c] of Object.entries(porUf)) {
      assert.ok(UFS.includes(uf), uf)
      assert.equal(String(c.ano), ano)
      assert.match(c.fonte, /^https:\/\/[a-z0-9.-]+\.gov\.br\//, `${uf}: fonte não é gov.br`)
      assert.match(c.verificadoEm, /^\d{4}-\d{2}-\d{2}$/)
      for (const tabela of [c.ipvaCotaUnica, c.licenciamento]) {
        if (!tabela) continue
        for (const [final, data] of Object.entries(tabela)) {
          assert.ok(FINAIS_PLACA.includes(final), `${uf}: final ${final}`)
          assert.match(data, new RegExp(`^${ano}-\\d{2}-\\d{2}$`), `${uf}/${final}: ${data}`)
        }
      }
    }
  }
})
test('sugestão: SP final 5 licenciamento 2026 = 30/09; UF ou ano sem tabela = null', () => {
  const sp = sugerirDataVeicular({ tipo: 'crlv', uf: 'SP', placaFinal: '5', ano: 2026 })
  assert.equal(sp?.data, '2026-09-30')
  assert.match(sp?.fonte ?? '', /agenciasp\.sp\.gov\.br/)
  assert.equal(sugerirDataVeicular({ tipo: 'crlv', uf: 'RS', placaFinal: '3', ano: 2026 })?.data, '2026-07-31')
  assert.equal(sugerirDataVeicular({ tipo: 'ipva', uf: 'SP', placaFinal: '5', ano: 2026 }), null)
  assert.equal(sugerirDataVeicular({ tipo: 'crlv', uf: 'SP', placaFinal: '5', ano: 2027 }), null)
  assert.equal(sugerirDataVeicular({ tipo: 'crlv', uf: 'XX', placaFinal: '5', ano: 2026 }), null)
  assert.equal(sugerirDataVeicular({ tipo: 'crlv', uf: 'SP', placaFinal: 'a', ano: 2026 }), null)
})
test('UFs disponíveis e final da placa', () => {
  assert.deepEqual(ufsDisponiveis('crlv', 2026), ['RJ', 'RS', 'SP'])
  assert.deepEqual(ufsDisponiveis('ipva', 2026), [])
  assert.equal(finalDaPlaca('ABC1D23'), '3')
  assert.equal(finalDaPlaca('abc-1234'), '4')
  assert.equal(finalDaPlaca('ABCDEFG'), null)
})
