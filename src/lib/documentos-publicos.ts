// Conteúdo das páginas públicas /documentos/<tipo>. Só afirmações que a lei
// ou o órgão sustentam; onde o prazo varia (estado, contrato, idade), o texto
// manda conferir na fonte. Sem & < > " ' em titulo/descricao: o build compara
// o texto cru com o HTML escapado.

import type { FonteConsulta } from '../data/consulta-multas-uf.ts'
import { linksConsultaMultas } from './multas.ts'
import { autoridadePara, type Autoridade } from './renovacao.ts'

export interface PerguntaPublica { pergunta: string; resposta: string }

export interface DocumentoPublico {
  slug: string
  nome: string
  titulo: string
  descricao: string
  oQueE: string
  validade: string
  comoRenovar: string
  faqs: PerguntaPublica[]
  // Só quando "validade/renovação" não descreve o documento (ex.: multa).
  h1?: string
  cta?: string
  rotulos?: { validade?: string; renovar?: string }
  // Canais oficiais fixos, além do portal da autoridade.
  links?: FonteConsulta[]
}

export const DOCUMENTOS_PUBLICOS: DocumentoPublico[] = [
  {
    slug: 'cnh',
    nome: 'CNH',
    titulo: 'CNH: validade, renovação e alerta de vencimento | DocLimpo',
    descricao: 'Quanto tempo vale a CNH pela sua idade, como renovar no Detran e como receber aviso por e-mail antes de vencer.',
    oQueE: 'A Carteira Nacional de Habilitação é o documento que autoriza a dirigir. Vencida, dirigir gera infração gravíssima, multa e retenção do veículo; a renovação continua possível, mas há prazo para não precisar de novo processo de habilitação.',
    validade: 'Desde abril de 2021 (Lei 14.071/2020), a validade depende da idade no exame: 10 anos até 49 anos, 5 anos de 50 a 69 e 3 anos a partir de 70. A data impressa na CNH é a referência.',
    comoRenovar: 'A renovação é feita no Detran do seu estado, em geral com exame médico em clínica credenciada e, dependendo da categoria, exame psicológico. Muitos estados permitem iniciar pelo site ou app do Detran e pelo gov.br.',
    faqs: [
      { pergunta: 'Posso renovar a CNH antes de vencer?', resposta: 'Sim. Em geral a renovação pode ser feita nos 30 dias anteriores ao vencimento sem perder validade; alguns estados aceitam antes. Confira no Detran.' },
      { pergunta: 'Quanto tempo posso ficar com a CNH vencida?', resposta: 'Há tolerância de 30 dias para dirigir com a CNH vencida. Depois disso, dirigir é infração gravíssima. Renovar continua possível por até 5 anos após o vencimento sem refazer o processo completo, conforme regra do Contran.' },
      { pergunta: 'O DocLimpo renova a CNH por mim?', resposta: 'Não. O DocLimpo avisa por e-mail 90, 30, 7 e 1 dia antes da data que você cadastrou e mostra onde renovar. A renovação é feita por você, no Detran.' },
    ],
  },
  {
    slug: 'crlv',
    nome: 'CRLV (licenciamento)',
    titulo: 'CRLV e licenciamento anual: prazo por final de placa | DocLimpo',
    descricao: 'O licenciamento do veículo vence todo ano, em mês definido pelo final da placa em cada estado. Veja como funciona e receba aviso antes.',
    oQueE: 'O Certificado de Registro e Licenciamento de Veículo comprova que o veículo está licenciado no ano. Hoje é digital (CRLV-e) e só é emitido depois de quitados o licenciamento, o IPVA e as multas.',
    validade: 'O licenciamento é anual. Cada estado publica um calendário com o mês-limite por final da placa; em alguns, como o Rio Grande do Sul, há uma data única para todos. Circular sem o licenciamento do ano é infração gravíssima com remoção do veículo.',
    comoRenovar: 'Pague a taxa de licenciamento (e IPVA e multas pendentes) pelos canais do Detran do seu estado ou bancos conveniados; o CRLV-e fica disponível no app Carteira Digital de Trânsito, no portal da Senatran ou no site do Detran.',
    faqs: [
      { pergunta: 'Qual é o prazo do meu licenciamento?', resposta: 'Depende do estado e do final da placa. Ao cadastrar um CRLV no DocLimpo, informe a UF e o final da placa: quando o calendário oficial do ano estiver carregado, a data é sugerida com a fonte.' },
      { pergunta: 'Preciso do CRLV em papel?', resposta: 'Não. O CRLV-e digital tem a mesma validade; pode ser apresentado pelo app Carteira Digital de Trânsito ou impresso em papel comum.' },
      { pergunta: 'O que acontece se atrasar?', resposta: 'O veículo fica irregular: circular gera infração gravíssima, multa e possível remoção. O documento do ano anterior deixa de valer no fim do prazo.' },
    ],
  },
  {
    slug: 'ipva',
    nome: 'IPVA',
    titulo: 'IPVA: calendário por final de placa e cota única | DocLimpo',
    descricao: 'O IPVA vence no início do ano, em datas que cada estado define pelo final da placa. Entenda cota única, parcelas e como ser avisado.',
    oQueE: 'O Imposto sobre a Propriedade de Veículos Automotores é estadual e anual. Sem o pagamento não há licenciamento, e o débito entra em dívida ativa.',
    validade: 'Cada Secretaria da Fazenda publica um calendário anual por final da placa, em geral entre janeiro e abril, com cota única (muitas vezes com desconto) e parcelas. As datas mudam todo ano e variam por estado.',
    comoRenovar: 'O pagamento é feito pelo site ou app da Secretaria da Fazenda do estado, bancos conveniados ou Pix, com o Renavam. Confira o calendário do seu estado a cada ano.',
    faqs: [
      { pergunta: 'Cota única ou parcelado?', resposta: 'A cota única costuma ter desconto quando paga no prazo do início do ano; o parcelamento distribui o valor em alguns meses. As regras e percentuais são de cada estado.' },
      { pergunta: 'O DocLimpo sabe a data do meu IPVA?', resposta: 'Ao cadastrar o IPVA, informe a UF e o final da placa. Quando o calendário oficial do ano estiver carregado, o DocLimpo sugere a data com a fonte; caso contrário, digite a data que a Sefaz informa.' },
      { pergunta: 'E veículos isentos?', resposta: 'Isenções (por idade do veículo, deficiência, táxi etc.) são definidas por cada estado e pedidas na Sefaz. O DocLimpo não consulta a situação do veículo.' },
    ],
  },
  {
    slug: 'multa',
    nome: 'Multa de trânsito',
    h1: 'Multa de trânsito: prazo para defesa, desconto e alerta antes de vencer.',
    cta: 'Acompanhar o prazo da minha multa',
    rotulos: { validade: 'Quais são os prazos', renovar: 'Onde consultar e pagar' },
    titulo: 'Multa de trânsito: prazo de defesa, desconto de 40% pelo SNE e alerta | DocLimpo',
    descricao: 'Defesa e indicação de condutor em 30 dias, 20% de desconto até o vencimento e 40% pelo SNE. Cadastre o prazo da notificação e receba aviso antes.',
    oQueE: 'A multa chega em duas cartas. A notificação da autuação não tem valor a pagar: abre o prazo para indicar o condutor ou apresentar defesa prévia. A notificação da penalidade traz o valor, o vencimento e o prazo de recurso. Multa não paga vira débito do veículo e impede o licenciamento (CTB, art. 131, § 2º).',
    validade: 'Defesa prévia e indicação do condutor: no mínimo 30 dias contados da notificação da autuação (CTB, art. 281-A e art. 257, § 7º). Recurso à JARI: no mínimo 30 dias da notificação da penalidade, e essa mesma data é o vencimento do pagamento (art. 282, §§ 4º e 5º). A data impressa na notificação é a que vale.',
    comoRenovar: 'Consulte e pague pelo Detran do seu estado, pelo Portal de Serviços SENATRAN ou pelo app Carteira Digital de Trânsito, com login gov.br. Até o vencimento, o pagamento tem 20% de desconto (CTB, art. 284); quem adere ao SNE e abre mão de defesa e recurso paga com 40% (art. 284, § 1º).',
    links: linksConsultaMultas(),
    faqs: [
      { pergunta: 'Como sei se tenho multa?', resposta: 'No Portal de Serviços SENATRAN ou no app Carteira Digital de Trânsito, com sua conta gov.br, você vê as infrações por condutor ou por veículo; o site do Detran do seu estado mostra as dele. O DocLimpo não consulta multas: ele guarda o prazo que você cadastra e avisa antes.' },
      { pergunta: 'Como consigo 40% de desconto?', resposta: 'Aderindo ao Sistema de Notificação Eletrônica (SNE) pelo Portal SENATRAN ou pelo app Carteira Digital de Trânsito, antes de a notificação ser enviada, e declarando que não vai apresentar defesa nem recurso. Vale para multas de órgãos aderentes ao SNE, pagas até o vencimento.' },
      { pergunta: 'Qual data cadastrar no DocLimpo?', resposta: 'A data-limite impressa na notificação que você recebeu: prazo de defesa ou indicação do condutor (autuação), vencimento com desconto ou prazo de recurso (penalidade). Se tiver só a data da notificação, o DocLimpo calcula o mínimo legal de 30 dias.' },
    ],
  },
  {
    slug: 'passaporte',
    nome: 'Passaporte',
    titulo: 'Passaporte: validade, renovação na Polícia Federal e alerta | DocLimpo',
    descricao: 'Passaporte brasileiro vale 10 anos para adultos e menos para crianças. Saiba como renovar e por que conferir a validade antes de viajar.',
    oQueE: 'O passaporte brasileiro é emitido pela Polícia Federal. Muitos países exigem validade mínima de 6 meses a partir da data de entrada, então o prazo útil é menor que o impresso.',
    validade: 'Para maiores de 18 anos, 10 anos. Para crianças e adolescentes, de 1 a 5 anos conforme a idade na emissão. A validade está na página de identificação.',
    comoRenovar: 'Não há renovação: é emitido um passaporte novo. O pedido começa no site da Polícia Federal, com pagamento da taxa (GRU) e agendamento em um posto para coleta de dados.',
    faqs: [
      { pergunta: 'Com quanta antecedência devo pedir?', resposta: 'Os prazos de entrega variam por posto e época do ano. Como muitos destinos exigem 6 meses de validade na entrada, cadastre no DocLimpo uma data 6 meses antes do vencimento se você viaja com frequência.' },
      { pergunta: 'Passaporte vencido serve para alguma coisa?', resposta: 'Serve como documento de identificação em algumas situações no Brasil, mas não para viajar. Leve-o ao posto: o número do anterior é informado no pedido.' },
      { pergunta: 'Onde renovo?', resposta: 'Em postos da Polícia Federal com agendamento pelo site da PF. O DocLimpo mostra o posto mais próximo se você informar seu CEP.' },
    ],
  },
  {
    slug: 'rg',
    nome: 'RG e CIN',
    titulo: 'RG e Carteira de Identidade Nacional: validade e renovação | DocLimpo',
    descricao: 'O RG antigo vale até 2032 e a nova CIN tem validade por faixa etária. Veja prazos, onde emitir e como receber aviso.',
    oQueE: 'A Carteira de Identidade Nacional (CIN) substitui gradualmente o RG, com o CPF como número único. O RG antigo continua aceito durante a transição.',
    validade: 'RG antigo: aceito até 28 de fevereiro de 2032. CIN: 5 anos para quem tem até 11 anos, 10 anos de 12 a 59 e validade indeterminada a partir dos 60 anos. Confira a data impressa no documento.',
    comoRenovar: 'A CIN é emitida pelo órgão de identificação do estado (Poupatempo, institutos de identificação), em geral com agendamento pelo site. É gratuita na primeira via.',
    faqs: [
      { pergunta: 'Preciso trocar o RG pela CIN agora?', resposta: 'Não. O RG antigo vale até 2032. A troca pode ser feita quando for conveniente ou quando o documento estiver danificado ou desatualizado.' },
      { pergunta: 'A foto desatualizada invalida o RG?', resposta: 'Legalmente não há prazo por foto, mas órgãos e empresas podem recusar documento com foto muito antiga. A CIN resolve isso com validade definida.' },
      { pergunta: 'O DocLimpo pede o número do RG?', resposta: 'Não. Só o tipo, a data de validade e um apelido opcional. Não coloque o número no apelido.' },
    ],
  },
  {
    slug: 'seguro',
    nome: 'Seguro auto',
    titulo: 'Seguro auto: fim de vigência, renovação e alerta | DocLimpo',
    descricao: 'A apólice do seguro do carro costuma valer 12 meses. Saiba por que cadastrar o fim da vigência e como negociar a renovação sem correria.',
    oQueE: 'A apólice de seguro auto tem data de início e fim de vigência. Fora da vigência, o veículo fica sem cobertura, mesmo que o pagamento das parcelas continue em dia até o fim.',
    validade: 'Em geral 12 meses, conforme a apólice. A data de fim de vigência está na apólice e no app da seguradora.',
    comoRenovar: 'A renovação é combinada com a seguradora ou o corretor. Com antecedência dá para comparar propostas, revisar coberturas e evitar carência ou perda de bônus.',
    faqs: [
      { pergunta: 'A seguradora renova sozinha?', resposta: 'Algumas enviam proposta de renovação automática; outras exigem aceite. Confira a apólice. O aviso do DocLimpo serve para você decidir com tempo.' },
      { pergunta: 'Que data cadastrar?', resposta: 'O fim da vigência. Se quiser tempo para cotar, cadastre também um documento de apelido "cotação" com data 30 dias antes.' },
      { pergunta: 'Vale para outros seguros?', resposta: 'Sim. Use o tipo Seguro auto para veículos e o tipo Contrato para seguro residencial, de vida ou outros.' },
    ],
  },
  {
    slug: 'plano_saude',
    nome: 'Plano de saúde',
    titulo: 'Plano de saúde: vigência, reajuste e carência | DocLimpo',
    descricao: 'Contratos de plano de saúde renovam automaticamente e reajustam no aniversário. Saiba quais datas acompanhar e como ser avisado.',
    oQueE: 'O contrato de plano de saúde individual, familiar ou coletivo tem vigência, data de aniversário (reajuste) e prazos de carência. Perder uma data pode custar caro na mensalidade ou no atendimento.',
    validade: 'Contratos individuais têm vigência mínima de 12 meses com renovação automática (Lei 9.656/1998). A data que costuma importar é o aniversário do contrato, quando ocorre o reajuste, ou o fim de uma carência.',
    comoRenovar: 'Não há renovação manual na maioria dos casos. Use o aviso para revisar o reajuste, comparar planos ou pedir portabilidade de carências à operadora.',
    faqs: [
      { pergunta: 'Que data cadastrar?', resposta: 'O aniversário do contrato (reajuste) ou o fim da carência mais relevante. Você pode cadastrar mais de uma data com apelidos diferentes.' },
      { pergunta: 'Portabilidade tem prazo?', resposta: 'A portabilidade de carências exige tempo mínimo de permanência no plano atual (em geral 2 anos, ou 3 se houve cobertura parcial temporária). Confira as regras da ANS.' },
      { pergunta: 'O DocLimpo acessa meu plano?', resposta: 'Não. Ele só guarda o tipo, a data e um apelido, e envia os avisos.' },
    ],
  },
  {
    slug: 'carteira_trabalho',
    nome: 'Carteira de trabalho',
    titulo: 'Carteira de trabalho digital: prazos que valem a pena acompanhar | DocLimpo',
    descricao: 'A CTPS não tem validade, mas contrato de experiência, aviso prévio e benefícios têm prazo. Veja quais datas cadastrar.',
    oQueE: 'A Carteira de Trabalho Digital (app ou gov.br) substitui a carteira física para quase tudo. O documento em si não vence; o que vence são prazos ligados ao contrato de trabalho.',
    validade: 'Não há validade da carteira. Prazos comuns: contrato de experiência (até 90 dias, prorrogável uma vez dentro desse total), aviso prévio, fim de contrato temporário e prazo para requerer seguro-desemprego.',
    comoRenovar: 'Não se renova. Para os prazos do contrato, a referência é o RH ou o próprio contrato; o DocLimpo só avisa nas datas que você cadastrar.',
    faqs: [
      { pergunta: 'Então por que cadastrar a CTPS?', resposta: 'Para acompanhar um prazo ligado a ela: fim da experiência, data-limite de um benefício ou uma pendência de anotação. Use o apelido para dizer qual.' },
      { pergunta: 'Ainda preciso da carteira física?', resposta: 'Só em casos específicos (por exemplo, para comprovar contratos antigos não migrados). A digital vale para admissão e consulta.' },
      { pergunta: 'Onde consulto meus contratos?', resposta: 'No app Carteira de Trabalho Digital ou no gov.br, na área do trabalhador.' },
    ],
  },
  {
    slug: 'garantia',
    nome: 'Garantia de produto',
    titulo: 'Garantia de produto ou serviço: prazo legal, contratual e alerta | DocLimpo',
    descricao: 'Garantia legal de 30 ou 90 dias mais a garantia contratual do fabricante. Guarde a nota fiscal e seja avisado antes do fim do prazo.',
    oQueE: 'Todo produto tem garantia legal pelo Código de Defesa do Consumidor e, muitas vezes, uma garantia contratual do fabricante ou uma estendida vendida à parte. O prazo conta da entrega do produto ou da conclusão do serviço.',
    validade: 'Garantia legal: 30 dias para bens não duráveis e 90 dias para duráveis (CDC, art. 26). A contratual (em geral 12 meses) soma-se à legal. A garantia estendida tem o prazo do contrato.',
    comoRenovar: 'Não se renova: usa-se. Para acionar, contate a loja ou a assistência do fabricante com a nota fiscal e o termo de garantia. O prazo de resposta para reparo é de 30 dias (CDC, art. 18).',
    faqs: [
      { pergunta: 'Que data cadastrar?', resposta: 'O fim da garantia contratual (data da compra mais o prazo do fabricante). Use o apelido para o produto e guarde a nota fiscal em local seguro.' },
      { pergunta: 'A garantia legal já está incluída no prazo do fabricante?', resposta: 'Não. Pelo entendimento consolidado, a legal soma-se à contratual. Na dúvida, conte com o prazo mais curto.' },
      { pergunta: 'Preciso enviar a nota fiscal ao DocLimpo?', resposta: 'Não. O DocLimpo não recebe arquivos; só a data e um apelido.' },
    ],
  },
  {
    slug: 'contrato',
    nome: 'Contrato e aluguel',
    titulo: 'Contrato de aluguel ou prestação: fim de vigência e aviso prévio | DocLimpo',
    descricao: 'Contratos vencem e renovam com prazos de aviso. Cadastre o fim da vigência ou a data-limite para avisar e evite renovação automática indesejada.',
    oQueE: 'Contratos de aluguel, prestação de serviços, assinaturas e fidelidade têm data de término e, muitas vezes, um prazo mínimo para comunicar a não renovação. Perder a data pode significar multa ou renovação automática.',
    validade: 'A do contrato. No aluguel residencial, contratos de 30 meses ou mais se encerram no prazo sem aviso; contratos menores prorrogam-se por prazo indeterminado (Lei 8.245/1991). Confira as cláusulas de prazo e aviso prévio.',
    comoRenovar: 'A renovação ou o encerramento são combinados com a outra parte (locador, imobiliária, prestador), por aditivo ou comunicação escrita dentro do prazo do contrato.',
    faqs: [
      { pergunta: 'Que data cadastrar?', resposta: 'A data-limite para dar o aviso (fim da vigência menos o prazo de aviso prévio do contrato) ou o próprio fim da vigência. Pode cadastrar as duas.' },
      { pergunta: 'Serve para assinatura de serviço?', resposta: 'Sim: fidelidade de internet, academia, software. Cadastre o fim da fidelidade para cancelar sem multa.' },
      { pergunta: 'O DocLimpo lê meu contrato?', resposta: 'Não. Ele não recebe arquivos; você informa só a data e um apelido.' },
    ],
  },
  {
    slug: 'exame',
    nome: 'Exame periódico e ASO',
    titulo: 'Exame periódico e ASO: prazos pela NR-7 e alerta | DocLimpo',
    descricao: 'O exame ocupacional periódico tem prazo pela NR-7 conforme idade e risco. Saiba quando repetir e como ser avisado.',
    oQueE: 'O Atestado de Saúde Ocupacional (ASO) registra os exames admissional, periódico, de retorno, de mudança de risco e demissional. O periódico se repete em intervalo definido no PCMSO da empresa.',
    validade: 'Pela NR-7, o periódico é em geral anual para menores de 18, maiores de 45 e funções com risco, e a cada 2 anos entre 18 e 45 anos em funções sem risco específico. O PCMSO da empresa pode definir prazo menor.',
    comoRenovar: 'O agendamento é feito pela empresa ou pelo trabalhador na clínica de saúde ocupacional indicada. Também vale para exames de rotina pedidos pelo seu médico.',
    faqs: [
      { pergunta: 'Que data cadastrar?', resposta: 'A data do próximo periódico (data do último ASO mais o intervalo do PCMSO) ou a data de retorno pedida pelo seu médico.' },
      { pergunta: 'E exames pessoais, fora do trabalho?', resposta: 'Use o mesmo tipo com um apelido (por exemplo, "check-up" ou "oftalmo") e a data de retorno.' },
      { pergunta: 'O DocLimpo guarda o resultado?', resposta: 'Não. Nenhum dado de saúde: só o tipo, a data e um apelido. Não escreva diagnósticos no apelido.' },
    ],
  },
]

export const SLUGS_PUBLICOS: readonly string[] = DOCUMENTOS_PUBLICOS.map(item => item.slug)

export function documentoPublicoPorSlug(slug: string): (DocumentoPublico & { autoridade: Autoridade }) | null {
  const item = DOCUMENTOS_PUBLICOS.find(candidate => candidate.slug === slug)
  return item ? { ...item, autoridade: autoridadePara(item.slug) } : null
}
