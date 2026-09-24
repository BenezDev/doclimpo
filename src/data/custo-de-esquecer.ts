// O que acontece quando um prazo do carro passa. Só entra aqui o que foi lido
// no texto oficial do Código de Trânsito Brasileiro (Lei 9.503/1997, versão
// compilada no Planalto), com o artigo e a data da consulta. Valores de multa
// e pontos: arts. 258 e 259 (gravíssima = R$ 293,47 e 7 pontos). Reconferir
// quando o CTB for alterado.

export interface CustoDeEsquecer {
  tipo: 'cnh' | 'crlv' | 'ipva' | 'multa'
  titulo: string
  consequencia: string
  artigo: string
  fonte: string
  verificadoEm: string
}

const CTB = 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm'

export const CUSTO_DE_ESQUECER: CustoDeEsquecer[] = [
  {
    tipo: 'cnh',
    titulo: 'CNH vencida há mais de 30 dias',
    consequencia: 'Infração gravíssima: R$ 293,47 e 7 pontos. O carro fica retido até chegar alguém com CNH válida.',
    artigo: 'CTB, art. 162, V',
    fonte: CTB,
    verificadoEm: '2026-09-24',
  },
  {
    tipo: 'crlv',
    titulo: 'Licenciamento atrasado',
    consequencia: 'Infração gravíssima: R$ 293,47 e 7 pontos. O carro pode ser removido para o pátio.',
    artigo: 'CTB, art. 230, V',
    fonte: CTB,
    verificadoEm: '2026-09-24',
  },
  {
    tipo: 'ipva',
    titulo: 'IPVA em aberto',
    consequencia: 'Sem tributos e multas quitados, o carro não é licenciado. Um atraso puxa o outro.',
    artigo: 'CTB, art. 131, § 2º',
    fonte: CTB,
    verificadoEm: '2026-09-24',
  },
  {
    tipo: 'multa',
    titulo: 'Multa paga depois do vencimento',
    consequencia: 'Você perde o desconto de 20%, ou de 40% para quem usa o SNE e não recorre.',
    artigo: 'CTB, art. 284',
    fonte: CTB,
    verificadoEm: '2026-09-24',
  },
]
