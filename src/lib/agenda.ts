// Exporta um vencimento para a agenda do usuário: link do Google Agenda e
// arquivo .ics (Apple, Outlook, Thunderbird). Lógica pura, sem DOM. O host do
// Google é fixo; só a query recebe dados, sempre codificados.

import { paraCompacto, somarDias, type DataISO } from './datas.ts'
import { JANELAS_ALERTA } from './planos.ts'

export interface EventoVencimento {
  titulo: string
  dataISO: DataISO
  descricao?: string
  url?: string
}

export const GOOGLE_AGENDA_HOST = 'https://calendar.google.com/calendar/render'

export function linkGoogleAgenda(evento: EventoVencimento): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: evento.titulo,
    // Evento de dia inteiro: fim exclusivo no dia seguinte.
    dates: `${paraCompacto(evento.dataISO)}/${paraCompacto(somarDias(evento.dataISO, 1))}`,
  })
  const detalhes = [evento.descricao, evento.url].filter(Boolean).join('\n')
  if (detalhes) params.set('details', detalhes)
  return `${GOOGLE_AGENDA_HOST}?${params.toString()}`
}

// RFC 5545 §3.3.11: escapa barra, ponto e vírgula, vírgula e quebras de linha.
export function escaparIcs(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

// RFC 5545 §3.1: linhas com mais de 75 octetos são dobradas com CRLF + espaço.
function dobrarLinha(linha: string): string[] {
  const bytes = new TextEncoder().encode(linha)
  if (bytes.length <= 75) return [linha]
  const partes: string[] = []
  let atual = ''
  let tamanho = 0
  for (const caractere of linha) {
    const peso = new TextEncoder().encode(caractere).length
    const limite = partes.length === 0 ? 75 : 74
    if (tamanho + peso > limite) {
      partes.push(atual)
      atual = ''
      tamanho = 0
    }
    atual += caractere
    tamanho += peso
  }
  if (atual) partes.push(atual)
  return partes.map((parte, index) => (index === 0 ? parte : ` ${parte}`))
}

function carimboUtc(agora: Date): string {
  return agora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

export interface OpcoesIcs {
  uid: string
  agora?: Date
  alarmes?: readonly number[]
}

export function gerarIcs(evento: EventoVencimento, opcoes: OpcoesIcs): string {
  const agora = opcoes.agora ?? new Date()
  const alarmes = opcoes.alarmes ?? JANELAS_ALERTA
  const descricao = [evento.descricao, evento.url].filter(Boolean).join('\n')
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DocLimpo//Vencimentos//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opcoes.uid}@doclimpo.com`,
    `DTSTAMP:${carimboUtc(agora)}`,
    `DTSTART;VALUE=DATE:${paraCompacto(evento.dataISO)}`,
    `DTEND;VALUE=DATE:${paraCompacto(somarDias(evento.dataISO, 1))}`,
    `SUMMARY:${escaparIcs(evento.titulo)}`,
    ...(descricao ? [`DESCRIPTION:${escaparIcs(descricao)}`] : []),
    ...(evento.url ? [`URL:${evento.url}`] : []),
    ...alarmes.flatMap(dias => [
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escaparIcs(evento.titulo)}`,
      `TRIGGER:-P${dias}D`,
      'END:VALARM',
    ]),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return linhas.flatMap(dobrarLinha).join('\r\n') + '\r\n'
}

export function nomeArquivoIcs(titulo: string): string {
  const base = titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()
  return `${base || 'vencimento'}.ics`
}
