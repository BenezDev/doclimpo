import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { PublicShell } from '../components/ui/PublicShell'
import { legalPublished, support } from '../lib/public-content'

const sections = [
  ['objeto', 'O que o DocLimpo faz'], ['conta', 'Sua conta'], ['planos', 'Plano gratuito e planos pagos'],
  ['alertas', 'Alertas'], ['uso', 'Uso aceitável'], ['responsabilidade', 'Limites de responsabilidade'],
  ['encerramento', 'Encerramento'], ['alteracoes', 'Alterações'], ['contato', 'Contato e foro'],
]

export default function Termos() {
  return (
    <PublicShell>
      <header className="privacy-heading">
        <span className="bz-micro">Transparência · DocLimpo</span>
        <h1>Termos de uso.</h1>
        <p>As regras de uso do serviço, escritas para serem lidas.</p>
        <span className="privacy-version">Versão · 21 set 2026</span>
      </header>
      <div className="privacy-layout">
        <nav className="privacy-index" aria-label="Nestes termos">
          <span className="bz-micro">Nesta página</span>
          {sections.map(([id, label], index) => <a key={id} href={`#${id}`}><span>0{index + 1}</span>{label}</a>)}
        </nav>
        <article className="privacy-body">
          {!legalPublished && (
            <div className="policy-draft" role="note"><ShieldCheck size={21} aria-hidden="true" /><div><strong>Minuta em revisão, antes da publicação.</strong><p>Falta identificar o responsável pelo serviço e o canal de atendimento. Esta versão descreve as regras do produto como ele funciona hoje.</p></div></div>
          )}
          <section id="objeto"><h2>01. O que o DocLimpo faz</h2><p>O DocLimpo organiza datas de vencimento de documentos que você cadastra (CNH, CRLV, IPVA, passaporte, RG, seguro auto, plano de saúde, carteira de trabalho, garantia, contrato, exame periódico e outros) e envia avisos por e-mail antes do prazo. Também mostra orientações de renovação e, se você informar seu endereço, unidades de atendimento próximas.</p><p>O DocLimpo <strong>não</strong> renova documentos, não paga taxas, não consulta cadastros de órgãos públicos e não substitui a conferência das datas por você. A data informada no cadastro é a referência de todos os avisos.</p></section>
          <section id="conta"><h2>02. Sua conta</h2><p>Para usar o serviço você cria uma conta com nome, e-mail válido e senha. Você é responsável por manter a senha em sigilo e por tudo o que for feito com o seu acesso. Se suspeitar de uso indevido, redefina a senha na tela de entrada.</p><p>O serviço é destinado a pessoas maiores de 18 anos, ou menores sob responsabilidade de um responsável legal. Cada conta é pessoal e organiza os documentos do próprio titular.</p></section>
          <section id="planos"><h2>03. Plano gratuito e planos pagos</h2><p>O plano gratuito permite acompanhar <strong>um documento</strong>, com alertas por e-mail, sem informar cartão. Não há prazo de validade para o plano gratuito.</p><p>Os planos pagos (Individual, MEI e Família) liberam documentos ilimitados e notificações no navegador. Preço, periodicidade e limites são exibidos antes da contratação, e a cobrança é mensal e recorrente até o cancelamento, que pode ser feito a qualquer momento pela sua conta. Em compras feitas pela internet, você pode desistir em até 7 dias após a contratação, com devolução do valor pago, conforme o Código de Defesa do Consumidor.</p></section>
          <section id="alertas"><h2>04. Alertas</h2><p>Os avisos são enviados por e-mail nas janelas de 90, 30, 7 e 1 dia antes da data cadastrada. Nos planos pagos, o mesmo aviso é enviado também como notificação push aos navegadores e dispositivos que você ativar em Minha conta. Prazos já passados no momento do cadastro não geram avisos retroativos. Você pode pausar os avisos e desativar dispositivos na sua conta.</p><p>A entrega depende de fatores fora do nosso controle: e-mail correto, caixa cheia, filtros de spam, permissão de notificações no navegador e disponibilidade dos provedores de envio. Por isso, os alertas são um apoio à sua organização, não uma garantia. Mantenha sua própria conferência das datas.</p></section>
          <section id="uso"><h2>05. Uso aceitável</h2><p>Use o DocLimpo apenas para documentos seus ou de pessoas que autorizaram você. Não cadastre CPF, número de documento ou dados de saúde no apelido; o serviço não precisa deles. Não tente acessar dados de outras contas, sobrecarregar o serviço ou usá-lo para enviar mensagens a terceiros.</p></section>
          <section id="responsabilidade"><h2>06. Limites de responsabilidade</h2><p>O DocLimpo é fornecido como um serviço de organização e lembrete. Não nos responsabilizamos por multas, taxas, perdas ou prejuízos decorrentes de documento vencido, de data cadastrada incorretamente ou de aviso não recebido, dentro dos limites permitidos pela lei. Nada nestes termos afasta direitos garantidos pelo Código de Defesa do Consumidor.</p></section>
          <section id="encerramento"><h2>07. Encerramento</h2><p>Você pode excluir sua conta a qualquer momento em <Link to="/conta">Minha conta</Link>. A exclusão remove seus documentos, alertas, endereço e perfil, e encerra o acesso. Podemos suspender ou encerrar contas usadas de forma abusiva ou contrária a estes termos, avisando pelo e-mail cadastrado quando possível.</p></section>
          <section id="alteracoes"><h2>08. Alterações</h2><p>Estes termos podem mudar para refletir novas funcionalidades ou exigências legais. A data de versão no topo desta página indica a última revisão. Mudanças relevantes são comunicadas pelo e-mail da conta antes de valerem. Continuar usando o serviço após a comunicação significa concordar com a nova versão.</p></section>
          <section id="contato"><h2>09. Contato e foro</h2><p><strong>Responsável pelo serviço:</strong> {support.controller ?? 'identificação a confirmar antes da publicação.'}</p><p><strong>Atendimento:</strong> {support.email ? <a href={`mailto:${support.email}`}>{support.email}</a> : 'canal a confirmar antes da publicação.'}{support.responseTime ? ` Primeira resposta em ${support.responseTime}.` : ''}</p><p>Estes termos seguem a legislação brasileira. Para questões de consumo, fica eleito o foro do seu domicílio. Os dados pessoais são tratados conforme a <Link to="/privacidade">política de privacidade</Link>.</p></section>
          <Link className="text-link" to="/">Voltar ao DocLimpo</Link>
        </article>
      </div>
    </PublicShell>
  )
}
