// Onde consultar e pagar multas de trânsito. Só entra aqui URL lida em página
// oficial (gov.br, SENATRAN ou Detran do estado), com a data da consulta. São
// links fixos: a placa nunca entra na URL nem sai do DocLimpo — o usuário se
// identifica no órgão (gov.br, Renavam). UF sem entrada cai nas fontes
// nacionais. Reconferir quando um Detran trocar de portal.

import type { Uf } from './calendario-veicular.ts'

export interface FonteConsulta {
  rotulo: string
  url: string
  verificadoEm: string
  observacao?: string
}

// Portal de Serviços SENATRAN (login gov.br): infrações por condutor ou por
// veículo, de todos os órgãos que reportam ao RENAINF. Serviços catalogados em
// https://www.gov.br/pt-br/servicos/consultar-online-suas-infracoes-de-transito
// e https://www.gov.br/pt-br/servicos/obter-desconto-sobre-o-valor-de-multas-de-transito
export const FONTES_NACIONAIS = {
  senatran: {
    rotulo: 'Minhas infrações (Portal SENATRAN)',
    url: 'https://portalservicos.senatran.serpro.gov.br/#/infracoes/consultar',
    verificadoEm: '2026-09-21',
    observacao: 'Consulta por condutor ou por veículo, com login gov.br.',
  },
  sne: {
    rotulo: 'Aderir ao SNE: 40% de desconto',
    url: 'https://portalservicos.senatran.serpro.gov.br/#/infracoes/minha-adesao-sne',
    verificadoEm: '2026-09-21',
    observacao: 'Notificação eletrônica pelo app Carteira Digital de Trânsito. Vale para multas de órgãos aderentes, pagas até o vencimento, sem defesa nem recurso (CTB, art. 284, § 1º).',
  },
} as const satisfies Record<string, FonteConsulta>

export interface ConsultaMultasUf extends FonteConsulta {
  uf: Uf
}

export const CONSULTA_MULTAS_UF: Partial<Record<Uf, ConsultaMultasUf>> = {
  MG: {
    uf: 'MG',
    rotulo: 'Infrações no Detran-MG',
    url: 'https://www.detran.mg.gov.br/infracoes',
    verificadoEm: '2026-09-21',
  },
  RJ: {
    uf: 'RJ',
    rotulo: 'Infrações no Detran-RJ',
    url: 'https://www.detran.rj.gov.br/menu/menu-infracoes',
    verificadoEm: '2026-09-21',
  },
  RS: {
    uf: 'RS',
    rotulo: 'Infrações e multas no DetranRS',
    url: 'https://www.detran.rs.gov.br/infracoes-multas',
    verificadoEm: '2026-09-21',
  },
  SP: {
    uf: 'SP',
    rotulo: 'Infrações no Detran-SP',
    url: 'https://www.detran.sp.gov.br/detransp?id=infracoes',
    verificadoEm: '2026-09-21',
    observacao: 'Autuações registradas pelo Detran-SP a partir de setembro de 2018; multas municipais e de rodovias ficam no órgão autuador ou no Portal SENATRAN.',
  },
}
