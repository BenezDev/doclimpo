// Mapeia cada tipo de documento ao órgão responsável pela renovação e monta o
// link de fallback (busca no mapa) quando não há unidade curada por perto.
// Lógica pura, testável.

export type TipoDocumento =
  | 'cnh'
  | 'crlv'
  | 'ipva'
  | 'multa'
  | 'passaporte'
  | 'rg'
  | 'seguro'
  | 'plano_saude'
  | 'carteira_trabalho'
  | 'garantia'
  | 'contrato'
  | 'exame'
  | 'alvara'
  | 'certidao'
  | 'das_mei'
  | 'outro'

// Rede física onde o documento é renovado. `null` = não há órgão público
// (documento privado, resolvido com o fornecedor).
export type Rede = 'poupatempo' | 'pf' | 'detran' | 'identificacao' | 'trabalho'

export interface Autoridade {
  rede: Rede | null
  orgao: string
  privado: boolean
  // Termo usado na busca do mapa e para casar com as unidades curadas.
  termoBusca: string
  portalUrl?: string
  observacao?: string
}

const AUTORIDADES: Record<TipoDocumento, Autoridade> = {
  cnh: {
    rede: 'detran',
    orgao: 'Detran',
    privado: false,
    termoBusca: 'Detran CNH',
    portalUrl: 'https://www.gov.br/pt-br/servicos/renovar-a-carteira-nacional-de-habilitacao',
  },
  crlv: {
    rede: 'detran',
    orgao: 'Detran',
    privado: false,
    termoBusca: 'Detran licenciamento CRLV',
  },
  ipva: {
    rede: 'detran',
    orgao: 'Secretaria da Fazenda / Detran',
    privado: false,
    termoBusca: 'IPVA licenciamento',
    observacao: 'O IPVA costuma ser resolvido online, pelo portal da Secretaria da Fazenda do seu estado.',
  },
  multa: {
    rede: 'detran',
    orgao: 'Detran / órgão autuador',
    privado: true,
    termoBusca: 'Detran multas',
    portalUrl: 'https://portalservicos.senatran.serpro.gov.br/',
    observacao: 'Multas são consultadas e pagas online: no Detran do estado, no Portal de Serviços SENATRAN ou no app Carteira Digital de Trânsito, onde a adesão ao SNE dá 40% de desconto se você não apresentar defesa nem recurso.',
  },
  passaporte: {
    rede: 'pf',
    orgao: 'Polícia Federal',
    privado: false,
    termoBusca: 'Posto de emissão de passaporte Polícia Federal',
    portalUrl: 'https://www.gov.br/pf/pt-br/assuntos/passaporte',
  },
  rg: {
    rede: 'identificacao',
    orgao: 'Poupatempo / posto de identificação',
    privado: false,
    termoBusca: 'Poupatempo RG identificação',
  },
  seguro: {
    rede: null,
    orgao: 'Sua seguradora',
    privado: true,
    termoBusca: '',
    observacao: 'A renovação é feita com a sua seguradora ou corretor de seguros.',
  },
  plano_saude: {
    rede: null,
    orgao: 'Sua operadora',
    privado: true,
    termoBusca: '',
    observacao: 'A renovação é feita com a sua operadora de plano de saúde.',
  },
  carteira_trabalho: {
    rede: 'trabalho',
    orgao: 'CTPS Digital / unidade do trabalho',
    privado: false,
    termoBusca: 'Superintendência Regional do Trabalho carteira de trabalho',
    portalUrl: 'https://www.gov.br/trabalho-e-emprego/pt-br/servicos/trabalhador/carteira-de-trabalho-digital',
    observacao: 'A carteira de trabalho hoje é digital (app ou gov.br). O atendimento presencial é para casos específicos.',
  },
  alvara: {
    rede: null,
    orgao: 'Prefeitura',
    privado: false,
    termoBusca: 'Prefeitura alvará de funcionamento',
    observacao: 'O alvará é renovado na prefeitura do município da empresa, em geral pelo portal online.',
  },
  certidao: {
    rede: null,
    orgao: 'Órgão emissor',
    privado: true,
    termoBusca: '',
    portalUrl: 'https://www.gov.br/receitafederal/pt-br/servicos/certidoes',
    observacao: 'Certidões negativas (Receita Federal, FGTS, trabalhista, estadual, municipal) são emitidas online no portal de cada órgão.',
  },
  das_mei: {
    rede: null,
    orgao: 'Portal do Empreendedor',
    privado: true,
    termoBusca: '',
    portalUrl: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor',
    observacao: 'O DAS do MEI é emitido e pago online no Portal do Empreendedor ou no app MEI.',
  },
  garantia: {
    rede: null,
    orgao: 'Loja ou fabricante',
    privado: true,
    termoBusca: '',
    observacao: 'A garantia é acionada com a loja ou o fabricante. Guarde a nota fiscal e o termo de garantia; o Código de Defesa do Consumidor garante 30 dias (bens não duráveis) ou 90 dias (duráveis) além do prazo contratual.',
  },
  contrato: {
    rede: null,
    orgao: 'A outra parte do contrato',
    privado: true,
    termoBusca: '',
    observacao: 'Renovação, reajuste ou encerramento são combinados com a outra parte (locador, imobiliária, prestador). Confira o prazo de aviso prévio no contrato.',
  },
  exame: {
    rede: null,
    orgao: 'Clínica ou serviço de saúde ocupacional',
    privado: true,
    termoBusca: '',
    observacao: 'Exames periódicos e o ASO são agendados com a clínica indicada pela empresa ou pelo seu médico.',
  },
  outro: {
    rede: null,
    orgao: 'Órgão responsável',
    privado: false,
    termoBusca: '',
    observacao: 'Confirme o canal de renovação no órgão responsável pelo documento.',
  },
}

export function autoridadePara(tipo: string): Autoridade {
  return AUTORIDADES[tipo as TipoDocumento] ?? AUTORIDADES.outro
}

// Link de busca no Google Maps (link externo comum, sem chave de API). Localiza
// pela cidade/UF do usuário quando disponível.
export function linkMapaFallback(termoBusca: string, local?: { cidade?: string | null; uf?: string | null }): string {
  const partes = [termoBusca, local?.cidade, local?.uf].filter(Boolean).join(' ')
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.trim())}`
}
