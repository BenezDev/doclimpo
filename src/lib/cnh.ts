// Validade da CNH pela idade no exame (CTB art. 147, §2º, redação da Lei
// 14.071/2020, em vigor desde 12/04/2021): 10 anos até 49 anos, 5 anos de 50
// a 69, 3 anos a partir de 70. Lógica pura; a data de nascimento não é
// armazenada — serve só para sugerir o vencimento.

import { parseData, somarAnos, type DataISO } from './datas.ts'

export function idadeEm(nascimentoISO: DataISO, dataISO: DataISO): number {
  const nascimento = parseData(nascimentoISO)
  const data = parseData(dataISO)
  let idade = data.getFullYear() - nascimento.getFullYear()
  const aniversarioPassou = data.getMonth() > nascimento.getMonth()
    || (data.getMonth() === nascimento.getMonth() && data.getDate() >= nascimento.getDate())
  if (!aniversarioPassou) idade -= 1
  return idade
}

export function anosValidadeCnh(idade: number): 10 | 5 | 3 {
  if (idade < 50) return 10
  if (idade < 70) return 5
  return 3
}

export function validadeCnh(nascimentoISO: DataISO, exameISO: DataISO): { validade: DataISO; anos: 10 | 5 | 3; idade: number } {
  const idade = idadeEm(nascimentoISO, exameISO)
  const anos = anosValidadeCnh(idade)
  return { validade: somarAnos(exameISO, anos), anos, idade }
}
