import { test } from 'node:test'
import assert from 'node:assert/strict'
import { escaparIcs, gerarIcs, linkGoogleAgenda, nomeArquivoIcs } from '../src/lib/agenda.ts'

const evento = { titulo: 'Vence: CNH; João', dataISO: '2026-10-12', descricao: 'Linha 1\nLinha 2, com vírgula', url: 'https://www.doclimpo.com/documento/abc' }

test('link do Google Agenda usa host fixo, dia inteiro e dados codificados', () => {
  const url = new URL(linkGoogleAgenda(evento))
  assert.equal(url.origin + url.pathname, 'https://calendar.google.com/calendar/render')
  assert.equal(url.searchParams.get('action'), 'TEMPLATE')
  assert.equal(url.searchParams.get('dates'), '20261012/20261013')
  assert.equal(url.searchParams.get('text'), evento.titulo)
  assert.match(url.searchParams.get('details'), /Linha 2, com vírgula\nhttps:\/\/www\.doclimpo\.com/)
})
test('ics tem evento de dia inteiro, quatro alarmes e escaping correto', () => {
  const ics = gerarIcs(evento, { uid: 'abc', agora: new Date(Date.UTC(2026, 8, 20, 12, 0, 0)) })
  assert.match(ics, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/)
  assert.match(ics, /DTSTART;VALUE=DATE:20261012\r\n/)
  assert.match(ics, /DTEND;VALUE=DATE:20261013\r\n/)
  assert.match(ics, /DTSTAMP:20260920T120000Z\r\n/)
  assert.match(ics, /UID:abc@doclimpo\.com\r\n/)
  assert.match(ics, /SUMMARY:Vence: CNH\\; João\r\n/)
  // Desdobra (RFC 5545 §3.1) antes de conferir o conteúdo.
  const desdobrado = ics.replace(/\r\n /g, '')
  assert.match(desdobrado, /DESCRIPTION:Linha 1\\nLinha 2\\, com vírgula\\nhttps:\/\/www\.doclimpo\.com\/documento\/abc\r\n/)
  assert.equal((ics.match(/BEGIN:VALARM/g) ?? []).length, 4)
  for (const dias of [90, 30, 7, 1]) assert.ok(ics.includes(`TRIGGER:-P${dias}D\r\n`), `alarme ${dias}`)
  assert.match(ics, /END:VCALENDAR\r\n$/)
  for (const linha of ics.split('\r\n')) assert.ok(new TextEncoder().encode(linha).length <= 75, `linha longa: ${linha}`)
})
test('linhas longas são dobradas e continuam com espaço', () => {
  const ics = gerarIcs({ titulo: 'x'.repeat(200), dataISO: '2026-01-01' }, { uid: 'u' })
  assert.match(ics, /SUMMARY:x+\r\n x+/)
})
test('escape e nome de arquivo', () => {
  assert.equal(escaparIcs('a;b,c\\d\ne'), 'a\\;b\\,c\\\\d\\ne')
  assert.equal(nomeArquivoIcs('Vence: CNH · João'), 'vence-cnh-joao.ics')
})
