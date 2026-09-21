import {
  ArrowRight,
  ArrowUpRight,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Mail,
  MapPin,
  PencilLine,
  ShieldCheck,
  Siren,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Brand, DocumentGlyph, StatusPill, ThemeToggle } from '../components/ui/Bezel'
import { ActionLink } from '../components/ui/ActionLink'
import { useTheme } from '../hooks/useTheme'
import { JANELAS_ALERTA, LIMITE_DOCUMENTOS_FREE, PLANOS, formatarPreco } from '../lib/planos'
import { formatarData, hojeISO, somarDias, statusPorDias } from '../lib/datas'
import { faqs, support, useCases, withDocumentIntent } from '../lib/public-content'
import '../styles/landing.css'

const sampleDocuments = [
  { type: 'cnh', title: 'CNH', days: 5 },
  { type: 'multa', title: 'Multa · radar', days: 12 },
  { type: 'crlv', title: 'CRLV · carro', days: 51 },
  { type: 'passaporte', title: 'Passaporte', days: 160 },
].map(document => ({ ...document, date: formatarData(somarDias(hojeISO(), document.days)), status: statusPorDias(document.days).id }))

const nextAlert = sampleDocuments
  .map(document => ({ title: document.title, window: JANELAS_ALERTA.find(janela => janela < document.days) }))
  .find(item => item.window !== undefined)

const facts = [
  { icon: Mail, text: 'Avisos em 90, 30, 7 e 1 dia' },
  { icon: Check, text: `${LIMITE_DOCUMENTOS_FREE} documento grátis, sem cartão` },
  { icon: FileText, text: 'Sem foto, sem upload' },
  { icon: ShieldCheck, text: 'Cancele quando quiser' },
]

const steps = [
  { title: 'Cadastre o documento', text: 'Escolha o tipo, informe a data de vencimento e, se quiser, um apelido. Não precisa enviar foto nem cópia.' },
  { title: 'O sistema calcula as janelas', text: 'A partir da data, o DocLimpo programa os avisos de 90, 30, 7 e 1 dia antes do vencimento.' },
  { title: 'O e-mail chega antes de vencer', text: 'Cada aviso traz o prazo restante e o link para o painel, onde você vê onde renovar o documento.' },
]

const features = [
  { icon: Mail, title: 'Alertas por e-mail e no navegador', text: 'Avisos em 90, 30, 7 e 1 dia antes do vencimento por e-mail. Nos planos pagos, também como notificação no navegador ou celular.' },
  { icon: MapPin, title: 'Onde renovar, por documento', text: 'Cada documento mostra o órgão responsável. Com seu CEP, opcional, aparece a unidade mais próxima.' },
  { icon: Siren, title: 'Multa: avisa antes de perder o desconto', text: 'Cadastre a data da notificação: o DocLimpo calcula o prazo legal de defesa ou recurso, avisa 30, 7 e 1 dia antes e mostra onde consultar e pagar (Detran, SENATRAN, SNE com 40% de desconto).' },
  { icon: PencilLine, title: 'Apelido e data editáveis', text: 'Dê um nome ao documento e ajuste a data quando renovar.' },
  { icon: CheckCircle2, title: 'Marcar como renovado', text: 'Renovou? Marque o documento e ele sai da lista de vencimentos.' },
  { icon: ShieldCheck, title: 'Só os dados necessários', text: 'Tipo, data e apelido. Sem foto e sem o número do documento.' },
  { icon: Ban, title: 'Não renova nem paga por você', text: 'A renovação, as taxas e o pagamento de multas continuam nos canais oficiais. O DocLimpo avisa e mostra o link; o resto é seu.', limit: true },
]

export default function Landing() {
  const { hash, search } = useLocation()
  const { dark, toggleTheme } = useTheme()
  const cadastro = withDocumentIntent('/cadastro', search)
  const login = withDocumentIntent('/login', search)
  const supportReady = Boolean(support.email && support.responseTime)

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' })
  }, [hash])

  return (
    <div className="bz-page landing-page">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="bz-topbar">
        <div className="bz-container bz-topbar__inner">
          <Link className="brand-link" to="/" aria-label="DocLimpo — início"><Brand /></Link>
          <nav className="landing-nav" aria-label="Seções da página">
            <a href="#como-funciona">Como funciona</a>
            <a href="#casos">Casos</a>
            <a href="#planos">Planos</a>
            <a href="#perguntas">Perguntas</a>
          </nav>
          <div className="bz-topbar__actions">
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
            <ActionLink variant="secondary" to={login}>Entrar</ActionLink>
            <ActionLink variant="primary" to={cadastro}>Começar grátis</ActionLink>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section className="bz-container landing-hero" aria-labelledby="titulo">
          <div>
            <span className="landing-eyebrow">Alertas de vencimento por e-mail</span>
            <h1 id="titulo">Saiba antes que o documento vença.</h1>
            <p className="landing-hero__lead">
              Cadastre CNH, CRLV, IPVA, multas de trânsito, passaporte e outros documentos com a data de vencimento.
              O DocLimpo envia um e-mail 90, 30, 7 e 1 dia antes.
            </p>
            <div className="landing-hero__actions">
              <ActionLink variant="primary" size="lg" to={cadastro}>Começar grátis<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></ActionLink>
              <ActionLink variant="secondary" size="lg" to={login}>Entrar</ActionLink>
            </div>
          </div>

          <div className="landing-demo" aria-label="Demonstração do painel com dados ilustrativos">
            <div className="landing-demo__card">
              <div className="landing-demo__bar">
                <div>
                  <strong>Meus documentos</strong>
                  <span>{sampleDocuments.length} documentos acompanhados</span>
                </div>
                <span className="landing-demo__tag">Demonstração · dados ilustrativos</span>
              </div>
              <ul className="landing-demo__list">
                {sampleDocuments.map(document => (
                  <li className="landing-demo__row" key={document.title}>
                    <DocumentGlyph type={document.type} />
                    <div>
                      <span className="landing-demo__name">{document.title}</span>
                      <span className="landing-demo__date">Vence em {document.date}</span>
                    </div>
                    <div className="landing-demo__meta">
                      <span className="landing-demo__days">{document.days} dias</span>
                      <StatusPill status={document.status} />
                    </div>
                  </li>
                ))}
              </ul>
              {nextAlert && (
                <div className="landing-demo__foot">
                  <Mail size={14} strokeWidth={1.75} aria-hidden="true" />
                  Próximo e-mail: {nextAlert.title}, {nextAlert.window} {nextAlert.window === 1 ? 'dia' : 'dias'} antes do vencimento.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="landing-facts" aria-label="Resumo do serviço">
          <ul className="bz-container landing-facts__list">
            {facts.map(fact => (
              <li key={fact.text}><fact.icon size={18} strokeWidth={1.75} aria-hidden="true" />{fact.text}</li>
            ))}
          </ul>
        </section>

        <section className="landing-section" id="como-funciona" aria-labelledby="como-funciona-titulo">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="bz-micro">Como funciona</span>
              <h2 id="como-funciona-titulo">Três passos. Depois, o aviso chega sozinho.</h2>
              <p>Você informa a data uma vez. O DocLimpo cuida das janelas e do e-mail.</p>
            </div>
            <ol className="landing-grid">
              {steps.map((step, index) => (
                <li className="landing-card" key={step.title}>
                  <span className="landing-step__number" aria-hidden="true">{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-section landing-section--divided" id="casos" aria-labelledby="casos-titulo">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="bz-micro">Casos</span>
              <h2 id="casos-titulo">Documentos que vencem enquanto a vida acontece.</h2>
              <p>Comece pelo que mais importa para você. Cada caso abre o cadastro já com o tipo escolhido.</p>
            </div>
            <div className="landing-grid landing-grid--casos">
              {useCases.map(item => (
                <article className="landing-card case-card" key={item.type}>
                  <div className="case-card__label"><DocumentGlyph type={item.type} /><span className="bz-micro">{item.label}</span></div>
                  <h3>{item.title}</h3>
                  <p>{item.context}</p>
                  <p>{item.action}</p>
                  <Link className="case-card__cta" to={`/cadastro?documento=${item.type}`}>{item.cta}<ArrowUpRight size={16} aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
            <p className="landing-note">Cenários ilustrativos de uso. Não são depoimentos de clientes nem resultados medidos.</p>
          </div>
        </section>

        <section className="landing-section landing-section--surface" aria-labelledby="funcoes-titulo">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="bz-micro">O que o DocLimpo faz e não faz</span>
              <h2 id="funcoes-titulo">Avisa com antecedência. O resto continua com você.</h2>
            </div>
            <div className="landing-grid landing-grid--features">
              {features.map(feature => (
                <article className={`landing-card${feature.limit ? ' landing-card--limit' : ''}`} key={feature.title}>
                  <feature.icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" id="planos" aria-labelledby="planos-titulo">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="bz-micro">Planos</span>
              <h2 id="planos-titulo">Comece grátis. Assine quando precisar de mais.</h2>
              <p>Um documento é grátis, sem cartão. Para acompanhar mais, escolha um plano mensal. Sem fidelidade: cancele quando quiser.</p>
            </div>
            <div className="landing-free" id="gratuito">
              <div>
                <span className="bz-micro">Plano gratuito</span>
                <h3>Gratuito <span className="bz-data">{formatarPreco(0)}</span></h3>
                <p>{LIMITE_DOCUMENTOS_FREE} documento ativo, alertas por e-mail e onde renovar. Sem cartão.</p>
              </div>
              <ActionLink variant="primary" size="md" to={cadastro}>Começar grátis<ArrowRight size={16} aria-hidden="true" /></ActionLink>
            </div>
            <div className="planos-grid landing-planos" role="list" aria-label="Planos pagos">
              {PLANOS.map(plano => (
                <article className={`plano-card${plano.destaque ? ' plano-card--destaque' : ''}`} role="listitem" key={plano.id}>
                  {plano.destaque && <span className="plano-card__selo">Mais escolhido</span>}
                  <h3>{plano.nome}</h3>
                  <p className="plano-card__descricao">{plano.descricao}</p>
                  <div className="plano-card__preco"><strong className="bz-data">{formatarPreco(plano.precoCentavos)}</strong><span>/mês</span></div>
                  <ul className="plano-card__lista">
                    {plano.beneficios.map(item => <li key={item}><Check size={14} strokeWidth={2} aria-hidden="true" />{item}</li>)}
                  </ul>
                  <ActionLink variant={plano.destaque ? 'primary' : 'secondary'} size="md" to={cadastro}>Começar grátis<ArrowRight size={16} aria-hidden="true" /></ActionLink>
                </article>
              ))}
            </div>
            <p className="planos-nota">Pagamento pelo Stripe. Desistência em até 7 dias com devolução integral (CDC). Detalhes nos <Link to="/termos">termos de uso</Link>.</p>
          </div>
        </section>

        <section className="landing-section landing-section--surface" id="perguntas" aria-labelledby="perguntas-titulo">
          <div className="bz-container landing-faq">
            <div className="landing-section__header">
              <span className="bz-micro">Perguntas</span>
              <h2 id="perguntas-titulo">O essencial antes de começar.</h2>
            </div>
            <div className="faq-list">
              {faqs.map((item, index) => (
                <details className="faq-item" key={item.question} id={`pergunta-${index + 1}`}>
                  <summary><span className="faq-number">0{index + 1}</span><span>{item.question}</span><ChevronDown size={18} aria-hidden="true" /></summary>
                  <div className="faq-answer"><p>{item.answer}</p>{index === faqs.length - 1 && <Link to="/privacidade">Ler a política de privacidade</Link>}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section" id="atendimento" aria-labelledby="atendimento-titulo">
          <div className="bz-container support-strip">
            <Clock3 size={23} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <span className="bz-micro">Atendimento</span>
              <h2 id="atendimento-titulo">{supportReady ? `Primeira resposta em ${support.responseTime}.` : 'Prazo de resposta em definição.'}</h2>
              <p>
                {supportReady
                  ? 'Prazo para o primeiro retorno, não para a resolução. Conte o que aconteceu sem enviar senhas ou cópias de documentos.'
                  : 'O canal oficial e o prazo de atendimento serão informados aqui após confirmação. Enquanto isso, consulte as perguntas acima.'}
              </p>
            </div>
            {support.email
              ? <a className="text-link" href={`mailto:${support.email}`}>{support.email}</a>
              : <a className="text-link" href="#perguntas">Consultar perguntas<ArrowUpRight size={16} aria-hidden="true" /></a>}
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="cta-titulo">
          <div className="bz-container landing-cta__panel">
            <div>
              <h2 id="cta-titulo">Comece pelo documento que não pode vencer.</h2>
              <p>Um documento grátis, avisos por e-mail, sem cartão.</p>
            </div>
            <ActionLink variant="primary" size="lg" to={cadastro}>Começar grátis<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" /></ActionLink>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="bz-container landing-footer__inner">
          <Link className="brand-link" to="/" aria-label="DocLimpo — início"><Brand /></Link>
          <nav className="landing-footer__links" aria-label="Rodapé">
            <Link to="/documentos">Documentos</Link>
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
            {support.email && <a href={`mailto:${support.email}`}>{support.email}</a>}
          </nav>
          <span className="landing-footer__meta">© {new Date().getFullYear()} DocLimpo</span>
        </div>
      </footer>
    </div>
  )
}
