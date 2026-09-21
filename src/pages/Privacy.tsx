import { Link } from 'react-router-dom'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { PublicShell } from '../components/ui/PublicShell'
import { legalPublished, support } from '../lib/public-content'

const sections = [
  ['dados', 'Dados que você informa'], ['finalidades', 'Por que usamos'], ['servicos', 'Serviços envolvidos'],
  ['navegador', 'Neste navegador'], ['retencao', 'Retenção e exclusão'], ['direitos', 'Seus direitos'], ['contato', 'Responsável e contato'],
]

export default function Privacy() {
  return (
    <PublicShell>
      <header className="privacy-heading">
        <span className="bz-micro">Transparência · DocLimpo</span>
        <h1>Política de privacidade.</h1>
        <p>O que é solicitado, para que serve e quais controles você tem sobre seus dados.</p>
        <span className="privacy-version">{legalPublished ? 'Versão · 21 set 2026' : 'Versão para revisão · 21 set 2026'}</span>
      </header>
      <div className="privacy-layout">
        <nav className="privacy-index" aria-label="Nesta política">
          <span className="bz-micro">Nesta página</span>
          {sections.map(([id, label], index) => <a key={id} href={`#${id}`}><span>0{index + 1}</span>{label}</a>)}
        </nav>
        <article className="privacy-body">
          {!legalPublished && (
            <div className="policy-draft" role="note"><ShieldCheck size={21} aria-hidden="true" /><div><strong>Minuta em revisão, antes da publicação.</strong><p>Falta validar a identificação do responsável e o canal de privacidade. Esta versão descreve o fluxo atual do produto.</p></div></div>
          )}
          <section id="dados"><h2>01. Dados que você informa</h2><p>No cadastro, solicitamos nome, e-mail e senha para criar seu acesso. Para acompanhar um documento, o formulário atual pede o tipo, a data de vencimento e um apelido opcional; para IPVA e licenciamento, você pode informar a UF e o final da placa para receber uma sugestão de prazo, e só esses dois dados ficam gravados junto ao documento. A calculadora de validade da CNH usa a data de nascimento apenas na tela, sem gravá-la. O registro fica associado à sua conta.</p><p>Não é necessário enviar foto, cópia ou número do documento nesse formulário. Evite incluir CPF, dados de saúde ou outras informações sensíveis no apelido. Também são registrados estados do documento e dos avisos, como resolução, agendamento e envio.</p><p>Se você ativar notificações no navegador (planos pagos), guardamos a assinatura de push gerada pelo seu navegador: o endereço do serviço de push e as chaves de cifragem, além de uma descrição do navegador. Isso identifica o dispositivo, não você; pode ser desativado dispositivo a dispositivo em Minha conta.</p><p>Opcionalmente, você pode informar seu endereço residencial (CEP, logradouro, número, bairro, cidade e UF) para indicarmos a unidade de renovação mais próxima de cada documento. É opcional, fica na sua conta e pode ser deixado em branco ou atualizado depois.</p></section>
          <section id="finalidades"><h2>02. Por que usamos esses dados</h2><p>Os dados permitem autenticar o acesso, organizar os prazos que você cadastrou e preparar os alertas por e-mail. A data informada por você é a referência: o DocLimpo não consulta automaticamente cadastros de órgãos públicos.</p><p>Bases legais: a conta, os documentos e os alertas são tratados para <strong>executar o serviço que você contratou</strong> (art. 7º, V, da LGPD); o endereço residencial e as notificações no navegador são tratados com base no seu <strong>consentimento</strong>, que pode ser revogado apagando o endereço ou desativando o dispositivo na sua conta; registros técnicos de acesso e segurança são mantidos por <strong>legítimo interesse</strong> em proteger as contas (art. 7º, IX).</p></section>
          <section id="servicos"><h2>03. Serviços envolvidos</h2><dl><dt>Supabase</dt><dd>Autenticação e armazenamento dos dados da conta e dos documentos.</dd><dt>Resend</dt><dd>Integração de envio de alertas. Quando um aviso é enviado, ela recebe o endereço de e-mail e o conteúdo necessário, como nome, identificação do documento e vencimento.</dd><dt>Serviços de push do navegador</dt><dd>Para notificações no navegador, o aviso é cifrado no nosso servidor e entregue pelo serviço de push do seu navegador (Google, Apple, Mozilla ou Microsoft, conforme o caso). Esses serviços recebem apenas o conteúdo cifrado e o endereço da assinatura.</dd><dt>Google Fonts</dt><dd>Carregamento das fontes da interface por conexão a servidores do Google, que podem receber informações técnicas da requisição, como endereço IP.</dd><dt>ViaCEP</dt><dd>Consulta pública de CEP. Ao pesquisar um CEP, enviamos apenas o número do CEP para preencher o endereço automaticamente; não enviamos seu endereço completo nem sua localização exata. A distância até as unidades de renovação é calculada no seu próprio dispositivo.</dd></dl><p>Esses prestadores podem operar servidores fora do Brasil; nesse caso a transferência internacional ocorre com base nas garantias contratuais oferecidas por cada um. A existência da integração de e-mail não garante a entrega de uma mensagem específica.</p></section>
          <section id="navegador"><h2>04. Armazenamento neste navegador</h2><p>O navegador guarda a sessão de autenticação, a preferência de tema claro ou escuro e uma marca de que você optou por adiar o cadastro de endereço. Limpar esses dados pode encerrar seu acesso local e redefinir o tema, mas não exclui a conta nem os documentos armazenados no serviço.</p><p>O código atual da interface não inclui ferramentas de publicidade ou analytics. Isso não significa ausência de registros técnicos nos serviços de infraestrutura.</p></section>
          <section id="retencao"><h2>05. Retenção e exclusão</h2><p>Seus dados ficam guardados enquanto a conta existir. No detalhe de um documento, você pode editar apelido e data, marcar como renovado ou excluir o registro. Marcar como renovado não é o mesmo que excluir.</p><p>Em <Link to="/conta">Minha conta</Link> você pode exportar todos os seus dados em um arquivo e excluir a conta. A exclusão apaga perfil, endereço, documentos, alertas e registros de envio, e remove seu acesso. Cópias de segurança mantidas pela infraestrutura são descartadas no ciclo de retenção do provedor; nesse intervalo, os dados não são usados para nenhuma finalidade.</p></section>
          <section id="direitos"><h2>06. Seus direitos</h2><p>Conforme a LGPD e as condições aplicáveis, você pode solicitar confirmação e acesso, correção, informações sobre compartilhamento, tratamento de dados excessivos ou irregulares, portabilidade, revogação de consentimento e eliminação quando cabível. O atendimento não se resume a apagar a conta.</p><p>Use o canal de privacidade abaixo para essas solicitações. Conheça as orientações oficiais da <a href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1" target="_blank" rel="noopener noreferrer">ANPD sobre direitos dos titulares <ArrowUpRight size={13} aria-hidden="true" /></a> e a <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noopener noreferrer">Lei Geral de Proteção de Dados</a>.</p></section>
          <section id="contato"><h2>07. Responsável e contato</h2><p><strong>Produto:</strong> DocLimpo.</p><p><strong>Responsável pelo tratamento:</strong> {support.controller ?? 'identificação a confirmar antes da publicação.'}</p><p><strong>Encarregado de dados:</strong> {support.encarregado ?? support.controller ?? 'a confirmar antes da publicação.'}</p><p><strong>Canal de privacidade:</strong> {support.email ? <a href={`mailto:${support.email}`}>{support.email}</a> : 'a confirmar antes da publicação. Não envie dados pessoais a endereços não verificados.'}{support.responseTime ? ` Primeira resposta em ${support.responseTime}.` : ''}</p><p>Atualizações nesta política devem indicar a nova data de revisão e refletir as funcionalidades efetivamente oferecidas.</p></section>
          <Link className="text-link" to="/">Voltar ao DocLimpo</Link>
        </article>
      </div>
    </PublicShell>
  )
}
