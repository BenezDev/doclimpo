// Calendários oficiais de IPVA (cota única) e licenciamento anual por UF e
// final da placa. Só entra aqui o que foi lido em página oficial (Sefaz,
// Detran ou agência de notícias do governo estadual), com a URL e a data da
// consulta. UF sem entrada = a interface diz "não disponível" e o usuário
// digita a data. Atualizar todo ano, quando os órgãos publicarem.
//
// ipvaCotaUnica: último dia para pagar a cota única (com desconto, quando
// houver). licenciamento: último dia do licenciamento anual.
//
// Situação em 21/09/2026: os calendários de IPVA 2026 já venceram (jan–mai) e
// as páginas que os publicaram saíram do ar ou estão suspensas pelo período de
// vedação eleitoral; entram junto com os de 2027, assim que publicados.

export type Uf =
  | 'AC' | 'AL' | 'AM' | 'AP' | 'BA' | 'CE' | 'DF' | 'ES' | 'GO' | 'MA' | 'MG' | 'MS' | 'MT'
  | 'PA' | 'PB' | 'PE' | 'PI' | 'PR' | 'RJ' | 'RN' | 'RO' | 'RR' | 'RS' | 'SC' | 'SE' | 'SP' | 'TO'

export type FinalPlaca = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export interface CalendarioUf {
  uf: Uf
  ano: number
  fonte: string
  verificadoEm: string
  ipvaCotaUnica?: Partial<Record<FinalPlaca, string>>
  licenciamento?: Partial<Record<FinalPlaca, string>>
  observacao?: string
}

function todosOsFinais(data: string): Record<FinalPlaca, string> {
  return { '0': data, '1': data, '2': data, '3': data, '4': data, '5': data, '6': data, '7': data, '8': data, '9': data }
}

export const CALENDARIO_VEICULAR: Record<number, Partial<Record<Uf, CalendarioUf>>> = {
  2026: {
    SP: {
      uf: 'SP',
      ano: 2026,
      fonte: 'https://www.agenciasp.sp.gov.br/calendario-oficial-do-licenciamento-de-veiculos-2026-comeca-em-julho-veja-datas/',
      verificadoEm: '2026-09-21',
      licenciamento: {
        '1': '2026-07-31', '2': '2026-07-31',
        '3': '2026-08-31', '4': '2026-08-31',
        '5': '2026-09-30', '6': '2026-09-30',
        '7': '2026-10-31', '8': '2026-10-31',
        '9': '2026-11-30',
        '0': '2026-12-31',
      },
      observacao: 'Licenciamento pode ser antecipado desde janeiro; o calendário oficial vai de julho a dezembro.',
    },
    RJ: {
      uf: 'RJ',
      ano: 2026,
      fonte: 'https://www.detran.rj.gov.br/veiculo/calendarios/licenciamento.html',
      verificadoEm: '2026-09-21',
      licenciamento: {
        '0': '2026-07-31', '1': '2026-07-31', '2': '2026-07-31',
        '3': '2026-08-31', '4': '2026-08-31', '5': '2026-08-31',
        '6': '2026-09-30', '7': '2026-09-30', '8': '2026-09-30', '9': '2026-09-30',
      },
      observacao: 'Calendário prorrogado pela portaria de 25/05/2026; até o prazo, o CRLV de 2025 segue válido.',
    },
    RS: {
      uf: 'RS',
      ano: 2026,
      fonte: 'https://www.detran.rs.gov.br/veiculos/servicos/986',
      verificadoEm: '2026-09-21',
      licenciamento: todosOsFinais('2026-07-31'),
      observacao: 'Desde 2025 o vencimento não é escalonado por final de placa (Portaria DetranRS nº 555/2025).',
    },
  },
}
