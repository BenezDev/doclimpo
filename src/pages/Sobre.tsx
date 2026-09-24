import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActionLink } from '../components/ui/ActionLink'
import { PublicShell } from '../components/ui/PublicShell'
import { support } from '../lib/public-content'

// /sobre: quem faz, por que existe e como falar com a gente.
export default function Sobre() {
  return (
    <PublicShell>
      <header className="privacy-heading">
        <span className="bz-micro">Sobre o DocLimpo</span>
        <h1>O lembrete que faltava para quem dirige.</h1>
        <p>CNH, licenciamento, IPVA e multa: cada um com uma data, um órgão e uma regra diferente. O DocLimpo guarda essas datas e avisa com tempo, sem pedir o que não precisa.</p>
      </header>
      <article className="privacy-body info-body">
        <section id="por-que">
          <h2>Por que existe</h2>
          <p>Documento não avisa que vai vencer. A carta da multa vai para a gaveta, o licenciamento muda de mês conforme o final da placa e a CNH vence no meio da semana mais corrida do ano. Quando alguém percebe, já é infração, pátio ou fila.</p>
          <p>O DocLimpo nasceu para resolver só isso, e bem: você informa a data uma vez e recebe o aviso antes do prazo, com o link do órgão certo para resolver.</p>
        </section>
        <section id="o-que-e">
          <h2>O que o DocLimpo é, e o que não é</h2>
          <ul>
            <li>É um serviço de avisos de vencimento, com guias de onde renovar e pagar.</li>
            <li>Não é despachante: não renova documentos nem paga taxas e multas por você.</li>
            <li>Não é órgão público e não consulta sistemas do governo. A data que vale é a que você informa.</li>
          </ul>
        </section>
        <section id="quem-faz">
          <h2>Quem faz</h2>
          <p>O DocLimpo é um produto independente, feito no Brasil{support.controller ? ` por ${support.controller}` : ''}.{support.cnpj ? ` CNPJ ${support.cnpj}.` : ''}</p>
        </section>
        <section id="contato">
          <h2>Contato</h2>
          {support.email
            ? <p>Escreva para <a href={`mailto:${support.email}`}>{support.email}</a>.{support.responseTime ? ` A primeira resposta chega em até ${support.responseTime}.` : ''} Conte o que aconteceu, sem enviar senhas ou cópias de documentos.</p>
            : <p>O canal de atendimento será informado aqui em breve.</p>}
          <p>Dúvidas sobre dados pessoais: veja a <Link to="/privacidade">política de privacidade</Link> e a página de <Link to="/seguranca">segurança</Link>.</p>
        </section>
        <div className="outcome-actions">
          <ActionLink to="/cadastro" variant="primary" size="lg">Começar grátis<ArrowRight size={17} aria-hidden="true" /></ActionLink>
        </div>
      </article>
    </PublicShell>
  )
}
