// Datas de vencimento chegam do Postgres como 'YYYY-MM-DD'. Passar isso direto
// para `new Date()` interpreta como UTC e, no Brasil, volta um dia. Tudo aqui
// trabalha no fuso local, por partes. Lógica pura: sem React, sem Supabase.

export type DataISO = string // 'YYYY-MM-DD'

const DIA_MS = 86_400_000

export function parseData(iso: DataISO): Date {
  const [ano, mes, dia] = iso.split('-')
  return new Date(Number(ano), Number(mes) - 1, Number(dia))
}

export function paraISO(data: Date): DataISO {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function hojeISO(agora: Date = new Date()): DataISO {
  return paraISO(agora)
}

// Dias inteiros entre hoje (meia-noite local) e a data. Negativo = já venceu.
export function diasRestantes(iso: DataISO, agora: Date = new Date()): number {
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
  return Math.round((parseData(iso).getTime() - hoje.getTime()) / DIA_MS)
}

export function formatarData(iso: DataISO): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatarDataLonga(iso: DataISO): string {
  return parseData(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// Formato compacto de calendário (iCalendar, Google Agenda): 'YYYYMMDD'.
export function paraCompacto(iso: DataISO): string {
  return iso.replaceAll('-', '')
}

export function somarDias(iso: DataISO, dias: number): DataISO {
  const data = parseData(iso)
  data.setDate(data.getDate() + dias)
  return paraISO(data)
}

// 29/02 + 1 ano cai em 28/02, não em 01/03.
export function somarAnos(iso: DataISO, anos: number): DataISO {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const alvo = new Date(ano + anos, mes - 1, 1)
  const ultimoDia = new Date(ano + anos, mes, 0).getDate()
  alvo.setDate(Math.min(dia, ultimoDia))
  return paraISO(alvo)
}

export type StatusPrazo = 'vencido' | 'critico' | 'atencao' | 'vigente'

// Mesmos limiares em todo o app: crítico até 7 dias, atenção até 90.
export function statusPorDias(dias: number): { id: StatusPrazo; label: string } {
  if (dias < 0) return { id: 'vencido', label: 'Vencido' }
  if (dias <= 7) return { id: 'critico', label: 'Crítico' }
  if (dias <= 90) return { id: 'atencao', label: 'Atenção' }
  return { id: 'vigente', label: 'Vigente' }
}

export function dataValida(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return paraISO(parseData(iso)) === iso
}
