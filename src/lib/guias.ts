// Guias públicos (/guias/<slug>) para quem dirige. Só entra aqui o que a lei ou
// o órgão oficial sustentam, com a fonte e a data da consulta: o texto do CTB é
// o compilado do Planalto, que já traz as mudanças da Lei 15.428/2026. Sem
// & < > " ' em titulo/descricao: o build compara o texto cru com o HTML escapado.

import type { PerguntaPublica } from './documentos-publicos.ts'

export interface FonteGuia { rotulo: string; url: string; verificadoEm: string }
export interface SecaoGuia { id: string; titulo: string; paragrafos: string[] }

export interface Guia {
  slug: string
  titulo: string
  descricao: string
  h1: string
  resumo: string
  // Tipo do documento no banco: ícone da página e ?documento= do cadastro.
  tipo: string
  cta: string
  secoes: SecaoGuia[]
  faqs: PerguntaPublica[]
  fontes: FonteGuia[]
  ferramenta?: { rotulo: string; to: string }
  atualizadoEm: string
}

export interface Calculadora { path: string; nome: string; descricao: string; tipo: string; faqs: PerguntaPublica[] }

export const CALCULADORAS: Calculadora[] = [
  {
    path: '/calculadora/validade-cnh',
    nome: 'Até quando vale minha CNH?',
    descricao: 'Validade de 10, 5 ou 3 anos pela sua idade no exame médico.',
    tipo: 'cnh',
    faqs: [
      { pergunta: 'Quanto tempo vale a CNH?', resposta: 'Depende da idade no dia do exame médico: 10 anos para menos de 50 anos, 5 anos de 50 a 69 e 3 anos a partir de 70 (CTB, art. 147, § 2º). O médico perito pode encurtar o prazo.' },
      { pergunta: 'Minha CNH foi feita antes de abril de 2021. A conta vale?', resposta: 'Não. Os prazos de 10, 5 e 3 anos valem para exames a partir de 12/04/2021, quando a Lei 14.071/2020 entrou em vigor. Antes disso, vale a data impressa na sua CNH.' },
      { pergunta: 'A data de nascimento fica salva?', resposta: 'Não. A conta é feita no seu navegador e nada do que você digita aqui é enviado ao DocLimpo.' },
    ],
  },
  {
    path: '/calculadora/prazo-multa',
    nome: 'Qual o prazo da minha multa?',
    descricao: 'Prazo mínimo para defesa prévia, indicação do condutor e recurso.',
    tipo: 'multa',
    faqs: [
      { pergunta: 'Qual o prazo para a defesa prévia?', resposta: 'Pelo menos 30 dias, contados da data de expedição da notificação da autuação (CTB, art. 281-A). O prazo exato vem impresso na carta.' },
      { pergunta: 'E para indicar o condutor?', resposta: '30 dias, contados da notificação da autuação (CTB, art. 257, § 7º).' },
      { pergunta: 'E para recorrer da multa?', resposta: 'Pelo menos 30 dias, contados da notificação da penalidade. A mesma data é o vencimento do pagamento (CTB, art. 282, §§ 4º e 5º).' },
    ],
  },
]

export function calculadoraPorPath(path: string): Calculadora | null {
  return CALCULADORAS.find(item => item.path === path) ?? null
}

const CTB: FonteGuia = { rotulo: 'Código de Trânsito Brasileiro (Lei 9.503/1997), texto compilado', url: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm', verificadoEm: '2026-09-27' }
const SNE: FonteGuia = { rotulo: 'gov.br: obter desconto sobre o valor de multas de trânsito (SNE)', url: 'https://www.gov.br/pt-br/servicos/obter-desconto-sobre-o-valor-de-multas-de-transito', verificadoEm: '2026-09-27' }
const CNH_DIGITAL: FonteGuia = { rotulo: 'gov.br: emitir a CNH digital no app CNH do Brasil', url: 'https://www.gov.br/pt-br/servicos/emitir-a-carteira-nacional-de-habilitacao-digital-cnh-e', verificadoEm: '2026-09-27' }
const PORTAL_SENATRAN: FonteGuia = { rotulo: 'Portal de Serviços da Senatran', url: 'https://portalservicos.senatran.serpro.gov.br/', verificadoEm: '2026-09-27' }

const CALCULADORA_CNH = { rotulo: 'Calcular a validade da minha CNH', to: '/calculadora/validade-cnh' }
const CALCULADORA_MULTA = { rotulo: 'Calcular o prazo da minha multa', to: '/calculadora/prazo-multa' }

export const GUIAS: Guia[] = [
  {
    slug: 'cnh-vencida',
    titulo: 'CNH vencida: multa, tolerância de 30 dias e renovação | DocLimpo',
    descricao: 'Com a CNH vencida há mais de 30 dias, dirigir é infração gravíssima. Veja a tolerância, quanto tempo a CNH vale e como funciona a renovação automática.',
    h1: 'CNH vencida: o que acontece e como renovar.',
    resumo: 'A CNH tem 30 dias de tolerância depois do vencimento. Passou disso, dirigir vira infração gravíssima e o carro fica retido até chegar alguém habilitado.',
    tipo: 'cnh',
    cta: 'Receber aviso antes da minha CNH vencer',
    secoes: [
      { id: 'o-que-diz-a-lei', titulo: 'O que diz a lei', paragrafos: [
        'Dirigir com a CNH vencida há mais de 30 dias é infração gravíssima: multa de R$ 293,47 e 7 pontos na carteira. O veículo fica retido até a apresentação de um condutor habilitado (CTB, art. 162, V, e arts. 258 e 259).',
        'Nos primeiros 30 dias depois do vencimento, a lei ainda não considera infração. Não é prazo para esquecer: é a folga para renovar sem multa.',
      ] },
      { id: 'quanto-tempo-vale', titulo: 'Quanto tempo a CNH vale', paragrafos: [
        'O exame médico que renova a CNH vale conforme a sua idade no dia do exame: 10 anos para quem tem menos de 50 anos, 5 anos de 50 a 69 anos e 3 anos a partir de 70 (CTB, art. 147, § 2º).',
        'O médico perito pode encurtar esse prazo quando há indício de doença que possa afetar a direção (art. 147, § 4º). Por isso, a data impressa na sua CNH é sempre a referência.',
      ] },
      { id: 'renovacao-automatica', titulo: 'Renovação automática para bom condutor', paragrafos: [
        'Desde a Lei 15.428/2026, quem está no Registro Nacional Positivo de Condutores (RNPC) quando a CNH vence tem a habilitação renovada automaticamente. Fica dispensado das outras etapas, mas o exame médico continua obrigatório (CTB, art. 268-A, § 7º).',
        'O RNPC reúne condutores sem infração com pontos nos últimos 12 meses, e entrar nele depende da sua autorização (art. 268-A, caput e § 2º). Você sai do cadastro se levar pontos, tiver o direito de dirigir suspenso ou deixar a CNH vencida por mais de 30 dias (art. 268-A, § 4º).',
      ] },
      { id: 'como-renovar', titulo: 'Como renovar', paragrafos: [
        'A renovação é feita pelo Detran do seu estado, com o exame médico. Confira no Detran as etapas, os valores e se dá para começar pela internet.',
        'Depois de renovada, a CNH digital fica disponível no app CNH do Brasil, do governo federal, com a mesma validade do documento físico.',
      ] },
    ],
    faqs: [
      { pergunta: 'Posso dirigir com a CNH vencida?', resposta: 'Até 30 dias depois do vencimento, sim, sem infração. A partir daí, é infração gravíssima, com multa de R$ 293,47 e 7 pontos (CTB, art. 162, V).' },
      { pergunta: 'Na renovação automática preciso fazer exame médico?', resposta: 'Sim. A lei dispensa as outras etapas do processo, mas mantém os exames de aptidão física e mental (CTB, art. 268-A, § 7º).' },
      { pergunta: 'Como sei até quando vai valer a minha próxima CNH?', resposta: 'Use a calculadora de validade da CNH: ela aplica os prazos de 10, 5 ou 3 anos pela sua idade no dia do exame.' },
    ],
    fontes: [CTB, CNH_DIGITAL, PORTAL_SENATRAN],
    ferramenta: CALCULADORA_CNH,
    atualizadoEm: '2026-09-27',
  },
  {
    slug: 'desconto-multa-sne',
    titulo: 'Multa com 40% de desconto: como funciona o SNE | DocLimpo',
    descricao: 'Pague a multa com 20% de desconto até o vencimento, ou 40% pelo SNE. Veja as condições da lei, como aderir e do que você abre mão.',
    h1: 'Multa com 40% de desconto: como funciona o SNE.',
    resumo: 'Toda multa paga até o vencimento tem 20% de desconto. Pelo Sistema de Notificação Eletrônica (SNE), o desconto sobe para 40%, com duas condições.',
    tipo: 'multa',
    cta: 'Receber aviso antes do vencimento da multa',
    secoes: [
      { id: 'vinte-por-cento', titulo: 'O desconto de 20%', paragrafos: [
        'A multa pode ser paga por 80% do valor até a data de vencimento que vem na notificação da penalidade (CTB, art. 284). Essa data é a mesma do prazo para recorrer (art. 282, § 5º).',
      ] },
      { id: 'quarenta-por-cento', titulo: 'O desconto de 40% pelo SNE', paragrafos: [
        'Quem aderiu ao SNE antes de a notificação da autuação ser enviada e declara, pelo sistema, que não vai apresentar defesa prévia nem recurso, reconhecendo a infração, paga 60% do valor até o vencimento (CTB, art. 284, § 1º).',
        'Na prática, a adesão precisa vir antes da multa: aderir depois de receber a notificação não dá o desconto para ela, só para as próximas.',
      ] },
      { id: 'como-aderir', titulo: 'Como aderir', paragrafos: [
        'A adesão é gratuita e feita pelo proprietário do veículo, pessoa física ou jurídica: no Portal de Serviços da Senatran, com login gov.br, em Minha adesão ao SNE, ou pelo app CNH do Brasil (antiga Carteira Digital de Trânsito), em Infrações.',
      ] },
      { id: 'quando-vale-a-pena', titulo: 'Quando vale a pena', paragrafos: [
        'Os 40% exigem abrir mão da defesa e do recurso. Se você acha que a multa está errada, os dois continuam sendo seu direito.',
        'Na regra geral, pagar a multa não impede de questioná-la depois (CTB, art. 284, § 2º). A exceção é justamente a opção do SNE, em que você declara que não vai recorrer.',
      ] },
    ],
    faqs: [
      { pergunta: 'Quem pode aderir ao SNE?', resposta: 'O proprietário do veículo, pessoa física ou jurídica. O serviço é gratuito e funciona pelo Portal de Serviços da Senatran ou pelo app CNH do Brasil.' },
      { pergunta: 'Aderi ao SNE depois da multa. Tenho os 40%?', resposta: 'Não para essa multa: a lei exige que a adesão seja anterior ao envio da notificação da autuação (CTB, art. 284, § 1º). As próximas já entram na regra.' },
      { pergunta: 'Pagar a multa me impede de recorrer?', resposta: 'Na regra geral, não (CTB, art. 284, § 2º). A exceção é a opção de 40% do SNE, em que você declara que não vai apresentar defesa nem recurso.' },
    ],
    fontes: [CTB, SNE, PORTAL_SENATRAN],
    ferramenta: CALCULADORA_MULTA,
    atualizadoEm: '2026-09-27',
  },
  {
    slug: 'prazos-da-multa',
    titulo: 'Prazos da multa: defesa prévia, condutor e recurso | DocLimpo',
    descricao: 'Quantos dias você tem para indicar o condutor, apresentar defesa prévia e recorrer de uma multa, e de qual carta cada prazo conta, pelo Código de Trânsito.',
    h1: 'Prazos da multa: defesa, indicação do condutor e recurso.',
    resumo: 'A multa chega em duas cartas, e cada uma abre prazos diferentes. Nenhum deles pode ser menor que 30 dias.',
    tipo: 'multa',
    cta: 'Acompanhar o prazo da minha multa',
    secoes: [
      { id: 'duas-cartas', titulo: 'As duas cartas', paragrafos: [
        'Primeiro chega a notificação da autuação, que avisa sobre a infração. Se a defesa prévia não for apresentada ou não for aceita, chega a notificação da penalidade, com o valor e a data para pagar (CTB, art. 282).',
      ] },
      { id: 'defesa-previa', titulo: 'Defesa prévia', paragrafos: [
        'O prazo da defesa prévia vem impresso na notificação da autuação e não pode ser menor que 30 dias, contados da data de expedição da notificação (CTB, art. 281-A).',
      ] },
      { id: 'indicacao-do-condutor', titulo: 'Indicação do condutor', paragrafos: [
        'Se quem dirigia não era você, o proprietário ou o principal condutor tem 30 dias, contados da notificação da autuação, para indicar quem estava ao volante. Passado o prazo, a infração fica com o principal condutor ou, na falta dele, com o proprietário (CTB, art. 257, § 7º).',
        'Se o carro é de empresa e ninguém é indicado, vem uma nova multa para a empresa, no valor de 2 vezes a original (art. 257, § 8º).',
      ] },
      { id: 'recurso', titulo: 'Recurso', paragrafos: [
        'A notificação da penalidade traz a data final para recorrer, que não pode ser menor que 30 dias contados da notificação (CTB, art. 282, § 4º). Essa mesma data é o vencimento do pagamento (§ 5º).',
        'Até o vencimento, a multa sai por 80% do valor; pelo SNE, por 60%, se você abrir mão da defesa e do recurso (art. 284).',
      ] },
    ],
    faqs: [
      { pergunta: 'O prazo conta do dia em que a carta chegou?', resposta: 'Para a defesa prévia, a lei conta da data de expedição da notificação (CTB, art. 281-A). Use a data impressa na carta, não o dia em que ela chegou.' },
      { pergunta: 'E se o prazo impresso for maior que 30 dias?', resposta: 'Vale o prazo impresso. Os 30 dias são o mínimo que a lei garante.' },
      { pergunta: 'O DocLimpo recorre por mim?', resposta: 'Não. O DocLimpo calcula o prazo e avisa antes de acabar. A defesa e o recurso são feitos no órgão que aplicou a multa.' },
    ],
    fontes: [CTB],
    ferramenta: CALCULADORA_MULTA,
    atualizadoEm: '2026-09-27',
  },
  {
    slug: 'licenciamento-atrasado',
    titulo: 'Licenciamento atrasado: multa, pátio e como regularizar | DocLimpo',
    descricao: 'Rodar com o licenciamento vencido é infração gravíssima e pode levar o carro ao pátio. Veja o que diz o CTB e por que IPVA e multas travam o licenciamento.',
    h1: 'Licenciamento atrasado: o que acontece e como regularizar.',
    resumo: 'O licenciamento é anual, e o prazo depende do estado e do final da placa. Rodar com ele vencido é infração gravíssima.',
    tipo: 'crlv',
    cta: 'Receber aviso antes do licenciamento vencer',
    secoes: [
      { id: 'o-que-diz-a-lei', titulo: 'O que diz a lei', paragrafos: [
        'Conduzir veículo que não esteja registrado e devidamente licenciado é infração gravíssima: multa de R$ 293,47 e 7 pontos, com remoção do veículo como medida administrativa (CTB, art. 230, V, e arts. 258 e 259).',
      ] },
      { id: 'debitos', titulo: 'IPVA e multas travam o licenciamento', paragrafos: [
        'O veículo só é considerado licenciado com os débitos quitados: tributos como o IPVA, encargos e multas de trânsito e ambientais ligados a ele (CTB, art. 131, § 2º). Por isso um IPVA atrasado costuma travar o licenciamento.',
        'A exceção é a multa que ainda está em defesa ou recurso: enquanto o julgamento não termina, ela não pode impedir o licenciamento (art. 284, § 3º).',
      ] },
      { id: 'documento', titulo: 'CRLV digital', paragrafos: [
        'O certificado de licenciamento pode ser físico ou digital, à escolha do proprietário (CTB, art. 131). O porte é obrigatório, mas fica dispensado quando o agente consegue conferir no sistema que o veículo está licenciado (art. 133).',
      ] },
      { id: 'prazo', titulo: 'Quando vence', paragrafos: [
        'Cada Detran define o calendário do licenciamento, em geral pelo final da placa. Confira o do seu estado e cadastre a data no DocLimpo para receber aviso antes de vencer.',
      ] },
    ],
    faqs: [
      { pergunta: 'Consigo licenciar com multa pendente?', resposta: 'O licenciamento exige os débitos do veículo quitados, incluindo multas (CTB, art. 131, § 2º). Multa ainda em defesa ou recurso não pode impedir o licenciamento (art. 284, § 3º).' },
      { pergunta: 'Preciso andar com o documento impresso?', resposta: 'Não precisa ser impresso: o certificado pode ser digital (CTB, art. 131). O porte fica dispensado quando o agente consegue conferir o licenciamento no sistema (art. 133).' },
      { pergunta: 'O DocLimpo paga o licenciamento?', resposta: 'Não. O DocLimpo avisa antes do prazo e mostra o caminho oficial. O pagamento é feito pelos canais do Detran do seu estado.' },
    ],
    fontes: [CTB],
    atualizadoEm: '2026-09-27',
  },
]

export function guiaPorSlug(slug: string): Guia | null {
  return GUIAS.find(guia => guia.slug === slug) ?? null
}
