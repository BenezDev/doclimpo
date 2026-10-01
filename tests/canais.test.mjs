import test from 'node:test'
import assert from 'node:assert/strict'
import { CANAIS_PAGOS, JANELAS_ALERTA, PLANOS, WHATSAPP_DISPONIVEL, canaisDoPlano } from '../src/lib/planos.ts'
import { canaisParaUsuario, classificarErroMeta, dataLocalBr, diasEntre, emLotes, higienizarTexto, IDS_POR_CONSULTA, JANELAS_ALERTA as JANELAS_SERVIDOR, janelaDoDia, normalizarE164, PUSH_ENDPOINT_RE, rotuloDocumento, somarDiasISO, textoAlerta } from '../supabase/functions/_shared/notificacoes.ts'

test('grátis só e-mail; pagos ganham push e, com o interruptor, WhatsApp', () => {
  assert.deepEqual(canaisDoPlano('FREE'), ['EMAIL'])
  for (const plano of ['INDIVIDUAL', 'MEI', 'FAMILIAR']) {
    const canais = canaisDoPlano(plano)
    assert.ok(canais.includes('PUSH'))
    assert.equal(canais.includes('WHATSAPP'), WHATSAPP_DISPONIVEL)
  }
  assert.deepEqual([...CANAIS_PAGOS], ['PUSH', 'WHATSAPP'])
})

test('com o WhatsApp desligado, nenhum benefício promete WhatsApp', () => {
  if (WHATSAPP_DISPONIVEL) return
  for (const plano of PLANOS) for (const item of plano.beneficios) assert.doesNotMatch(item, /whatsapp/i, `${plano.id}: ${item}`)
})

test('servidor: canais por usuário respeitam plano, preferências e dispositivos', () => {
  const base = { plano: 'INDIVIDUAL', notificationEmail: true, notificationWhatsapp: true, whatsappVerificado: true, pushCount: 2 }
  assert.deepEqual(canaisParaUsuario(base), ['EMAIL', 'PUSH', 'WHATSAPP'])
  assert.deepEqual(canaisParaUsuario({ ...base, plano: 'FREE' }), ['EMAIL'])
  assert.deepEqual(canaisParaUsuario({ ...base, notificationEmail: false, pushCount: 0 }), ['WHATSAPP'])
  assert.deepEqual(canaisParaUsuario({ ...base, whatsappVerificado: false }), ['EMAIL', 'PUSH'])
  assert.deepEqual(canaisParaUsuario({ ...base, notificationWhatsapp: false, pushCount: 0 }), ['EMAIL'])
})

test('texto do alerta e rótulo higienizado', () => {
  assert.equal(textoAlerta(7, 'CNH').titulo, 'Seu CNH vence em 7 dias')
  assert.equal(textoAlerta(1, 'CNH').titulo, 'Seu CNH vence em 1 dia')
  // O dia do vencimento não é "venceu": o usuário ainda tem o dia inteiro.
  assert.equal(textoAlerta(0, 'CNH').titulo, 'Seu CNH vence hoje')
  assert.equal(textoAlerta(-3, 'CNH').titulo, 'Seu CNH venceu')
  assert.equal(rotuloDocumento({ tipo: 'cnh', apelido: null }), 'CNH')
  assert.equal(rotuloDocumento({ tipo: 'garantia', apelido: null }), 'Garantia')
  // "Seu prazo da multa vence em 7 dias" — o texto do alerta é agnóstico ao tipo.
  assert.equal(rotuloDocumento({ tipo: 'multa', apelido: null }), 'prazo da multa')
  assert.equal(rotuloDocumento({ tipo: 'cnh', apelido: 'Meu\n\tcarro    novo' }), 'Meu carro novo')
  assert.equal(higienizarTexto('x'.repeat(80), 10).length, 10)
})

test('E.164: normaliza formatos brasileiros e recusa lixo', () => {
  assert.equal(normalizarE164('(11) 99999-9999'), '+5511999999999')
  assert.equal(normalizarE164('11999999999'), '+5511999999999')
  assert.equal(normalizarE164('+55 11 99999 9999'), '+5511999999999')
  assert.equal(normalizarE164('5511999999999'), '+5511999999999')
  assert.equal(normalizarE164('abc'), null)
  assert.equal(normalizarE164('+0123'), null)
})

test('allowlist de endpoints de push e classificação de erros da Meta', () => {
  assert.ok(PUSH_ENDPOINT_RE.test('https://fcm.googleapis.com/fcm/send/abc'))
  assert.ok(PUSH_ENDPOINT_RE.test('https://web.push.apple.com/QWxs'))
  assert.ok(PUSH_ENDPOINT_RE.test('https://wns2-par02p.notify.windows.com/w/?token=x'))
  assert.ok(!PUSH_ENDPOINT_RE.test('https://evil.example/fcm.googleapis.com/'))
  assert.ok(!PUSH_ENDPOINT_RE.test('http://fcm.googleapis.com/x'))
  assert.equal(classificarErroMeta(131026, 400), 'desativar')
  assert.equal(classificarErroMeta(130429, 429), 'retentar')
  assert.equal(classificarErroMeta(190, 401), 'configuracao')
  assert.equal(classificarErroMeta(undefined, 503), 'retentar')
  assert.equal(classificarErroMeta(999999, 400), 'falha')
})

test('janelas de alerta: front e servidor prometem os mesmos dias', () => {
  assert.deepEqual([...JANELAS_SERVIDOR].sort((a, b) => b - a), [...JANELAS_ALERTA])
})

test('datas da rodada: dia no calendário brasileiro, diferença e soma', () => {
  // 22:00 em Brasília de 30/09 é 01:00 UTC de 01/10: o dia é 30/09.
  assert.equal(dataLocalBr('2026-10-01T01:00:00Z'), '2026-09-30')
  assert.equal(dataLocalBr('2026-10-01T12:00:00Z'), '2026-10-01')
  assert.equal(diasEntre('2026-10-01', '2026-10-31'), 30)
  assert.equal(diasEntre('2026-10-01', '2026-09-28'), -3)
  // Atravessa a virada do ano e o fim de mês sem erro de fuso.
  assert.equal(somarDiasISO('2026-12-30', 90), '2027-03-30')
  assert.equal(somarDiasISO('2026-03-01', -1), '2026-02-28')
})

test('janelaDoDia: dia exato de cada janela', () => {
  const antigo = '2026-01-01T12:00:00Z'
  for (const [vencimento, esperado] of [['2026-12-30', 90], ['2026-10-31', 30], ['2026-10-08', 7], ['2026-10-02', 1]]) {
    assert.equal(janelaDoDia({ data_vencimento: vencimento, criado_em: antigo }, '2026-10-01'), esperado, vencimento)
  }
})

test('janelaDoDia: entre janelas, a vigente é a mais apertada já alcançada', () => {
  const antigo = '2026-01-01T12:00:00Z'
  // 45 dias restantes: já passou de 90, ainda não chegou a 30.
  assert.equal(janelaDoDia({ data_vencimento: '2026-11-15', criado_em: antigo }, '2026-10-01'), 90)
  // 25 dias: a janela de 30 é a vigente (e o índice único impede repetir).
  assert.equal(janelaDoDia({ data_vencimento: '2026-10-26', criado_em: antigo }, '2026-10-01'), 30)
  assert.equal(janelaDoDia({ data_vencimento: '2026-10-05', criado_em: antigo }, '2026-10-01'), 7)
  // Vence hoje: ainda dentro da janela de 1 dia.
  assert.equal(janelaDoDia({ data_vencimento: '2026-10-01', criado_em: antigo }, '2026-10-01'), 1)
  // Mais de 90 dias à frente: nada a enfileirar ainda.
  assert.equal(janelaDoDia({ data_vencimento: '2027-06-01', criado_em: antigo }, '2026-10-01'), null)
  // Vencido: o aviso é a janela 0, pelo outro caminho da rodada.
  assert.equal(janelaDoDia({ data_vencimento: '2026-09-30', criado_em: antigo }, '2026-10-01'), null)
})

test('janelaDoDia: cron parado um dia atrasa o aviso, não o perde', () => {
  const doc = { data_vencimento: '2026-10-31', criado_em: '2026-01-01T12:00:00Z' }
  // Dia da janela de 30 (rodada perdida).
  assert.equal(janelaDoDia(doc, '2026-10-01'), 30)
  // Dias seguintes: a mesma janela continua vigente, então o aviso sai.
  for (const hoje of ['2026-10-02', '2026-10-10', '2026-10-23']) {
    assert.equal(janelaDoDia(doc, hoje), 30, hoje)
  }
  // Com 7 dias restantes, a janela vigente passa a ser 7.
  assert.equal(janelaDoDia(doc, '2026-10-24'), 7)
})

test('janelaDoDia: documento cadastrado já perto do fim não dispara janelas largas', () => {
  // Cadastrado hoje com vencimento em 3 dias: só recebe o aviso de 1 dia.
  const recente = { data_vencimento: '2026-10-04', criado_em: '2026-10-01T12:00:00Z' }
  assert.equal(janelaDoDia(recente, '2026-10-01'), null)
  assert.equal(janelaDoDia(recente, '2026-10-02'), null)
  assert.equal(janelaDoDia(recente, '2026-10-03'), 1)
  // Cadastrado com exatamente 7 dias de antecedência: a janela de 7 vale.
  assert.equal(janelaDoDia({ data_vencimento: '2026-10-08', criado_em: '2026-10-01T12:00:00Z' }, '2026-10-01'), 7)
})

test('emLotes mantém o filtro .in() abaixo do limite da linha de requisição', () => {
  // Um uuid com vírgula gasta 37 bytes; o corte precisa manter a folga.
  assert.ok(IDS_POR_CONSULTA * 37 < 8192)
  assert.deepEqual(emLotes([], 100), [])
  assert.deepEqual(emLotes([1, 2, 3], 2), [[1, 2], [3]])
  // Nenhum item some nem se repete, e nenhuma fatia passa do tamanho.
  const ids = Array.from({ length: 250 }, (_, i) => i)
  const lotes = emLotes(ids)
  assert.deepEqual(lotes.flat(), ids)
  for (const lote of lotes) assert.ok(lote.length <= IDS_POR_CONSULTA)
})
