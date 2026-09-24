import { PLANO_SLUGS, type PlanoSlug } from './planos.ts'

export const faqs = [
  { question: 'O DocLimpo é gratuito?', answer: 'Um documento é grátis para sempre, sem cartão. Para acompanhar mais, há três planos mensais: Individual (R$ 9,90), MEI (R$ 19,89, com os documentos da empresa) e Família (R$ 29,89, até 4 pessoas com contas próprias). Sem fidelidade: você cancela quando quiser.' },
  { question: 'Quais documentos posso acompanhar?', answer: 'Do carro: CNH, licenciamento (CRLV), IPVA, multas e seguro auto. E também passaporte, RG, plano de saúde, carteira de trabalho, garantia, contrato e exame periódico. No plano MEI entram alvará, certidões e o DAS. Você informa a data que vale para o seu caso.' },
  { question: 'Como e quando chegam os avisos?', answer: 'Por e-mail, 90, 30, 7 e 1 dia antes de vencer. Nos planos pagos, o mesmo aviso chega também como notificação no celular ou no computador. Prazos que já passaram não geram aviso retroativo. Se não achar o e-mail, confira o spam e salve o endereço do DocLimpo nos seus contatos.' },
  { question: 'O DocLimpo paga ou renova por mim?', answer: 'Não. O DocLimpo avisa com antecedência e mostra o caminho oficial: Detran do seu estado, gov.br, SENATRAN ou Polícia Federal. A renovação e o pagamento de taxas e multas são feitos por você, direto no órgão, sem intermediário.' },
  { question: 'Por que vocês não pedem CPF nem foto do documento?', answer: 'Porque não precisa. Para avisar, basta o tipo e a data de vencimento. A placa do carro é opcional: serve só para mostrar o calendário e os links do seu estado, e nunca vai para outro site. O DocLimpo não pede CPF, foto do documento nem senha do gov.br.' },
  { question: 'Meus dados ficam seguros?', answer: 'Cada conta só enxerga os próprios dados, com isolamento feito no banco de dados, e a conexão é criptografada. O pagamento acontece na Cakto: o DocLimpo não recebe os dados do cartão. Você pode exportar seus dados ou excluir a conta quando quiser, na página Minha conta.' },
  { question: 'Posso cancelar quando quiser?', answer: 'Sim, na página Minha conta, sem multa. O plano continua até o fim do mês que você já pagou. Se desistir em até 7 dias depois da assinatura, a devolução é integral, como manda o Código de Defesa do Consumidor.' },
  { question: 'E se a data que eu cadastrei estiver errada?', answer: 'O DocLimpo avisa com base na data que você informou, e ela pode ser corrigida a qualquer momento no painel. O cadastro ajuda a acertar: na CNH, calcula a validade pela sua idade e pela data do exame; no IPVA e no licenciamento, usa o final da placa quando o calendário do estado já saiu; na multa, conta o prazo a partir da notificação. Na dúvida, confira no documento ou no órgão.' },
]

const documentTypes = ['cnh', 'crlv', 'ipva', 'multa', 'passaporte', 'rg', 'seguro', 'plano_saude', 'carteira_trabalho', 'garantia', 'contrato', 'exame', 'outro']

export function documentIntent(search: string) {
  const value = new URLSearchParams(search).get('documento') ?? ''
  return documentTypes.includes(value) ? value : ''
}

export function planoIntent(search: string): PlanoSlug | '' {
  const value = new URLSearchParams(search).get('plano') ?? ''
  return (PLANO_SLUGS as readonly string[]).includes(value) ? value as PlanoSlug : ''
}

// Leva adiante só as intenções conhecidas (?documento= e ?plano=) entre
// cadastro, login, agradecimento e painel. E-mail, token e destinos
// arbitrários nunca são propagados.
export function withIntent(path: string, search: string) {
  const params = new URLSearchParams()
  const documento = documentIntent(search)
  const plano = planoIntent(search)
  if (documento) params.set('documento', documento)
  if (plano) params.set('plano', plano)
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

// Identificação do operador. É o único interruptor de publicação das páginas
// legais: enquanto `controller` ou `email` forem null, a landing mostra
// "prazo em definição" e /privacidade e /termos exibem o aviso de minuta.
// Preencha com dados reais antes de lançar — nunca com placeholders.
//   controller   razão social ou nome do responsável pelo tratamento (LGPD)
//   cnpj         CNPJ do operador; enquanto null, o rodapé não mostra a linha institucional
//   email        canal de atendimento e de privacidade (recebe pedidos de titulares)
//   responseTime prazo da primeira resposta, ex.: "2 dias úteis"
//   encarregado  nome do encarregado de dados (opcional; pode ser o próprio responsável)
export const support: { email: string | null; responseTime: string | null; controller: string | null; cnpj: string | null; encarregado: string | null } = {
  email: 'joaovictorkattwinkel@gmail.com',
  responseTime: '2 dias úteis',
  controller: 'João Victor Benez Kattwinkel',
  cnpj: null,
  encarregado: 'João Victor Benez Kattwinkel',
}

// Verdadeiro quando o operador já se identificou: páginas legais saem de minuta.
export const legalPublished = Boolean(support.controller && support.email)
