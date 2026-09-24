import { Link } from 'react-router-dom'
import { PublicShell } from '../components/ui/PublicShell'
import { support } from '../lib/public-content'

// /seguranca: como os dados são protegidos, em linguagem direta. O detalhe
// jurídico fica em /privacidade; aqui só o que o produto faz de fato.
export default function Seguranca() {
  return (
    <PublicShell>
      <header className="privacy-heading">
        <span className="bz-micro">Segurança</span>
        <h1>Como cuidamos dos seus dados.</h1>
        <p>O jeito mais seguro de guardar um dado é não pedir. Por isso o DocLimpo trabalha com o mínimo: o tipo do documento e a data em que ele vence.</p>
      </header>
      <article className="privacy-body info-body">
        <section id="nao-pedimos">
          <h2>O que não pedimos</h2>
          <ul>
            <li>Foto, cópia ou número do documento.</li>
            <li>CPF e senha do gov.br. Você entra nos órgãos oficiais com o seu próprio login.</li>
            <li>Dados do cartão. A assinatura é paga na Cakto, e o DocLimpo recebe só a situação do pagamento.</li>
          </ul>
        </section>
        <section id="o-que-guardamos">
          <h2>O que guardamos</h2>
          <p>Nome, e-mail e os documentos que você cadastra: tipo, data de vencimento e um apelido opcional. Se você quiser, também a placa e a UF do carro, o endereço para achar a unidade de atendimento mais perto e o celular ou computador que recebe as notificações.</p>
        </section>
        <section id="protecao">
          <h2>Como protegemos</h2>
          <ul>
            <li>Cada conta só enxerga os próprios registros. A regra fica no banco de dados, e não só na tela.</li>
            <li>A conexão com o site é sempre criptografada.</li>
            <li>O banco de dados fica no Brasil, em servidores na região de São Paulo.</li>
            <li>Nada é vendido nem usado para publicidade.</li>
          </ul>
        </section>
        <section id="controle">
          <h2>O controle é seu</h2>
          <p>Em <Link to="/conta">Minha conta</Link> você pausa os avisos, exporta todos os seus dados em um arquivo e exclui a conta quando quiser. A exclusão apaga perfil, documentos, veículos e avisos.</p>
        </section>
        <section id="problema">
          <h2>Achou um problema?</h2>
          <p>{support.email ? <>Escreva para <a href={`mailto:${support.email}`}>{support.email}</a>. </> : ''}Descreva o que viu, sem enviar senhas ou cópias de documentos. As regras completas estão na <Link to="/privacidade">política de privacidade</Link>.</p>
        </section>
      </article>
    </PublicShell>
  )
}
