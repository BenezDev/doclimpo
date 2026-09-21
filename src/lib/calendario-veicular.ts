// Sugestão de prazo de IPVA e licenciamento (CRLV) a partir de UF + final da
// placa, usando o calendário do ano em src/data. Lógica pura: sem UF, sem ano
// ou sem regra por dígito, devolve null e a UI cai no fallback (+1 ano, ou o
// usuário digita). O usuário sempre confirma a data; a fonte oficial vai junto.

import { CALENDARIO_VEICULAR, type CalendarioUf, type FinalPlaca, type Uf } from '../data/calendario-veicular.ts'
import type { DataISO } from './datas.ts'

export const UFS: readonly Uf[] = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']
export const FINAIS_PLACA: readonly FinalPlaca[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

export type TipoVeicular = 'ipva' | 'crlv'

export interface SugestaoVeicular {
  data: DataISO
  fonte: string
  verificadoEm: string
  observacao?: string
}

export function ehUf(valor: unknown): valor is Uf {
  return typeof valor === 'string' && (UFS as readonly string[]).includes(valor)
}

export function ehFinalPlaca(valor: unknown): valor is FinalPlaca {
  return typeof valor === 'string' && (FINAIS_PLACA as readonly string[]).includes(valor)
}

// Último dígito numérico da placa (Mercosul ou antiga): "ABC1D23" → "3".
export function finalDaPlaca(placa: string): FinalPlaca | null {
  const digitos = placa.replace(/\D/g, '')
  const ultimo = digitos.at(-1)
  return ehFinalPlaca(ultimo) ? ultimo : null
}

export function calendarioDa(uf: string, ano: number): CalendarioUf | null {
  const calendario = CALENDARIO_VEICULAR[ano]?.[uf as Uf]
  return calendario ?? null
}

export function sugerirDataVeicular(entrada: { tipo: TipoVeicular; uf: string; placaFinal: string; ano: number }): SugestaoVeicular | null {
  if (!ehUf(entrada.uf) || !ehFinalPlaca(entrada.placaFinal)) return null
  const calendario = calendarioDa(entrada.uf, entrada.ano)
  if (!calendario) return null
  const tabela = entrada.tipo === 'ipva' ? calendario.ipvaCotaUnica : calendario.licenciamento
  const data = tabela?.[entrada.placaFinal]
  if (!data) return null
  return { data, fonte: calendario.fonte, verificadoEm: calendario.verificadoEm, observacao: calendario.observacao }
}

// UFs com tabela para o tipo no ano (para a UI mostrar o que existe).
export function ufsDisponiveis(tipo: TipoVeicular, ano: number): Uf[] {
  const doAno = CALENDARIO_VEICULAR[ano] ?? {}
  return UFS.filter(uf => {
    const c = doAno[uf]
    const tabela = tipo === 'ipva' ? c?.ipvaCotaUnica : c?.licenciamento
    return Boolean(tabela && Object.keys(tabela).length > 0)
  })
}
