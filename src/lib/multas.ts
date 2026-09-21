// Prazos de uma multa de trânsito e onde consultá-la. Lógica pura, testável.
//
// A multa tem dois momentos, cada um com prazo próprio (CTB, Lei 9.503/1997):
// - notificação da autuação → defesa prévia (art. 281-A) e indicação do
//   condutor (art. 257, § 7º): no mínimo 30 dias;
// - notificação da penalidade → recurso à JARI (art. 282, § 4º): no mínimo 30
//   dias; a mesma data é o vencimento do pagamento (§ 5º), com 20% de desconto
//   (art. 284) ou 40% pelo SNE (art. 284, § 1º).
// Sugerimos o mínimo legal contado da data da notificação; a data impressa na
// notificação é a que vale, e o usuário sempre confirma. O DocLimpo não
// consulta multas — os links são fixos, por UF, lidos em página oficial.

import { CONSULTA_MULTAS_UF, FONTES_NACIONAIS, type FonteConsulta } from '../data/consulta-multas-uf.ts'
import { ehUf } from './calendario-veicular.ts'
import { dataValida, somarDias, type DataISO } from './datas.ts'

export const PRAZOS_MULTA = ['defesa', 'desconto', 'recurso'] as const
export type PrazoMulta = (typeof PRAZOS_MULTA)[number]

export interface RegraPrazo {
  rotulo: string
  descricao: string
  // Dias mínimos a partir da notificação; null = a data vem impressa, sem cálculo.
  dias: number | null
  base: string
}

export const REGRAS_PRAZO: Record<PrazoMulta, RegraPrazo> = {
  defesa: {
    rotulo: 'Defesa prévia ou indicação do condutor',
    descricao: 'Conta da notificação da autuação (a primeira carta, sem valor a pagar).',
    dias: 30,
    base: 'CTB, art. 281-A e art. 257, § 7º',
  },
  desconto: {
    rotulo: 'Pagamento com desconto',
    descricao: 'O vencimento vem impresso na notificação da penalidade: até ele, 20% de desconto; 40% pelo SNE.',
    dias: null,
    base: 'CTB, art. 284',
  },
  recurso: {
    rotulo: 'Recurso à JARI',
    descricao: 'Conta da notificação da penalidade (a carta com o valor da multa).',
    dias: 30,
    base: 'CTB, art. 282, § 4º',
  },
}

export function ehPrazoMulta(valor: unknown): valor is PrazoMulta {
  return typeof valor === 'string' && (PRAZOS_MULTA as readonly string[]).includes(valor)
}

export interface SugestaoPrazoMulta {
  data: DataISO
  dias: number
  base: string
}

export function sugerirPrazoMulta(prazo: PrazoMulta, dataNotificacao: string): SugestaoPrazoMulta | null {
  const regra = REGRAS_PRAZO[prazo]
  if (regra.dias === null || !dataValida(dataNotificacao)) return null
  return { data: somarDias(dataNotificacao, regra.dias), dias: regra.dias, base: regra.base }
}

// Detran da UF (quando conferido) e depois as fontes nacionais. A UF só escolhe
// uma entrada do mapa: nada do usuário entra na URL.
export function linksConsultaMultas(uf?: string | null): FonteConsulta[] {
  const doEstado = ehUf(uf) ? CONSULTA_MULTAS_UF[uf] : undefined
  return [...(doEstado ? [doEstado] : []), FONTES_NACIONAIS.senatran, FONTES_NACIONAIS.sne]
}
