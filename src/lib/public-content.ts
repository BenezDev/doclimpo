export const faqs = [
  { question: 'O DocLimpo é gratuito?', answer: 'Você acompanha um documento gratuitamente, sem informar cartão. Para acompanhar mais, há três planos mensais: Individual (R$ 9,90), MEI (R$ 19,89, com documentos da empresa) e Família (R$ 29,89, até 4 pessoas com contas próprias). Sem fidelidade: cancele quando quiser.' },
  { question: 'Quais documentos posso acompanhar?', answer: 'CNH, CRLV, IPVA, passaporte, RG, seguro auto, plano de saúde, carteira de trabalho e outros documentos. Você informa a data aplicável ao seu caso: o DocLimpo não consulta nem calcula vencimentos em órgãos oficiais.' },
  { question: 'Como e quando recebo os alertas?', answer: 'Os avisos são por e-mail, nas janelas de 90, 30, 7 e 1 dia antes do vencimento. Nos planos pagos, o mesmo aviso chega também como notificação no navegador ou celular, nos dispositivos que você ativar. Prazos já passados não geram avisos retroativos. Confira seu endereço e a pasta de spam; mantenha também sua própria conferência das datas.' },
  { question: 'O DocLimpo renova o documento por mim?', answer: 'Não. O DocLimpo organiza datas, avisos e orientações. A renovação e o pagamento de eventuais taxas continuam sendo feitos por você, nos canais oficiais responsáveis pelo documento.' },
  { question: 'Preciso enviar uma foto do meu documento?', answer: 'Não. O cadastro atual pede tipo, vencimento e, se quiser, um apelido. Você também pode informar seu endereço, de forma opcional, para ver a unidade de renovação mais próxima. Evite colocar CPF ou outros dados sensíveis no apelido. Consulte a política de privacidade para entender o uso dos dados da conta e dos alertas.' },
]

export const useCases = [
  { type: 'cnh', number: '01', label: 'Na rotina', title: 'Sua CNH não avisa que vai vencer.', context: 'Você dirige todos os dias. A data de validade, nem sempre olha.', action: 'Cadastre o vencimento da CNH e consulte os próximos passos antes de renovar.', cta: 'Acompanhar minha CNH', detail: 'CNH · Habilitação' },
  { type: 'passaporte', number: '02', label: 'Na próxima viagem', title: 'O embarque começa antes da mala.', context: 'Passagem, hospedagem, roteiro. E a validade do passaporte?', action: 'Organize a data e confira as exigências do destino com antecedência.', cta: 'Acompanhar meu passaporte', detail: 'Passaporte · Viagem' },
  { type: 'seguro', number: '03', label: 'No seu planejamento', title: 'A renovação merece espaço na agenda.', context: 'A apólice vence enquanto o resto da vida acontece.', action: 'Registre o fim da vigência para ter o prazo à mão ao conversar com sua seguradora.', cta: 'Acompanhar meu seguro', detail: 'Seguro auto · Vigência' },
]

const documentTypes = ['cnh', 'crlv', 'ipva', 'passaporte', 'rg', 'seguro', 'plano_saude', 'carteira_trabalho', 'outro']

export function documentIntent(search: string) {
  const value = new URLSearchParams(search).get('documento') ?? ''
  return documentTypes.includes(value) ? value : ''
}

export function withDocumentIntent(path: string, search: string) {
  const type = documentIntent(search)
  return type ? `${path}?documento=${type}` : path
}

// Identificação do operador. É o único interruptor de publicação das páginas
// legais: enquanto `controller` ou `email` forem null, a landing mostra
// "prazo em definição" e /privacidade e /termos exibem o aviso de minuta.
// Preencha com dados reais antes de lançar — nunca com placeholders.
//   controller   razão social ou nome do responsável pelo tratamento (LGPD)
//   email        canal de atendimento e de privacidade (recebe pedidos de titulares)
//   responseTime prazo da primeira resposta, ex.: "2 dias úteis"
//   encarregado  nome do encarregado de dados (opcional; pode ser o próprio responsável)
export const support: { email: string | null; responseTime: string | null; controller: string | null; encarregado: string | null } = {
  email: 'joaovictorkattwinkel@gmail.com',
  responseTime: '2 dias úteis',
  controller: 'João Victor Benez Kattwinkel',
  encarregado: 'João Victor Benez Kattwinkel',
}

// Verdadeiro quando o operador já se identificou: páginas legais saem de minuta.
export const legalPublished = Boolean(support.controller && support.email)
