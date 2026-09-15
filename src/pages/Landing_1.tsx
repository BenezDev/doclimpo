import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Check,
  Clock3,
  ChevronDown,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { useEffect } from 'react'
import { PLANOS, formatarPreco } from '../lib/planos'
import { Link, useLocation } from 'react-router-dom'
import {
  Brand,
  DocumentGlyph,
  StatusPill,
  ThemeToggle,
} from '../components/ui/Bezel'
import { useTheme } from '../hooks/useTheme'
import { fadeUp, stagger } from '../lib/motion'
import { ActionLink } from '../components/ui/ActionLink'
import { faqs, support, useCases } from '../lib/public-content'

function exampleDate(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toLocaleDateString('pt-BR')
}

const sampleDocuments = [
  {
    type: 'cnh',
    title: 'CNH principal',
    date: exampleDate(5),
    days: '5 dias',
    status: 'critico' as const,
  },
  {
    type: 'crlv',
    title: 'CRLV · Veículo',
    date: exampleDate(51),
    days: '51 dias',
    status: 'atencao' as const,
  },
  {
    type: 'passaporte',
    title: 'Passaporte',
    date: exampleDate(160),
    days: '160 dias',
    status: 'vigente' as const,
  },
]

const productFacts = [
  { value: '01', label: 'documento no plano gratuito' },
  { value: '90·30·7·1', label: 'janelas de alerta antes do vencimento' },
  { value: '09', label: 'tipos de documento suportados' },
  { value: 'EMAIL', label: 'canal dos avisos de vencimento' },
]

const steps = [
  {
    title: 'Cadastre o que vence',
    description: 'Escolha o tipo, informe a data e dê um nome que faça sentido para você. Não precisa enviar uma cópia do documento.',
    meta: 'Tipo, data e apelido opcional',
  },
  {
    title: 'Receba o alerta antes do problema',
    description: 'O DocLimpo acompanha as janelas de 90, 30, 7 e 1 dia e organiza os avisos por e-mail.',
    meta: 'Quatro janelas de prevenção',
  },
  {
    title: 'Renove com contexto',
    description: 'Abra o documento, veja o prazo restante e consulte o roteiro de renovação sem caçar informação em cinco abas.',
    meta: 'Prazo, risco e próximos passos',
  },
]

const risks = [
  { document: 'CNH', detail: 'Planejar a renovação sem interromper a rotina', impact: 'Rotina' },
  { document: 'CRLV', detail: 'Conferir o prazo e as pendências do veículo', impact: 'Veículo' },
  { document: 'Passaporte', detail: 'Checar validade e exigências antes de viajar', impact: 'Viagem' },
  { document: 'Seguro auto', detail: 'Conversar sobre a renovação antes do fim da vigência', impact: 'Proteção' },
]

export default function Landing() {
  const { hash } = useLocation()
  const reduceMotion = useReducedMotion()
  const { dark, toggleTheme } = useTheme()
  const motionProps = reduceMotion ? {} : fadeUp

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' })
  }, [hash])

  return (
    <div className="bz-page landing-page">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="bz-topbar">
        <div className="bz-container bz-topbar__inner">
          <Link className="brand-link" to="/" aria-label="DocLimpo — início"><Brand /></Link>
          <nav className="landing-nav" aria-label="Navegação principal">
            <a href="#como-funciona">Como funciona</a>
            <a href="#casos">Casos de uso</a>
            <a href="#perguntas">Perguntas</a>
          </nav>
          <div className="bz-topbar__actions">
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
            <ActionLink variant="ghost" to="/login">Entrar</ActionLink>
            <ActionLink variant="secondary" to="/cadastro">Criar conta</ActionLink>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section className="bz-container--wide landing-hero">
          <motion.div className="landing-hero__copy" {...motionProps}>
            <span className="landing-kicker">Prevenção documental, sem planilha</span>
            <h1>O prazo vence. Sua memória não precisa vencer junto.</h1>
            <p className="landing-hero__lead">
              Centralize CNH, CRLV, passaporte, IPVA e outros documentos. O DocLimpo acompanha as datas e avisa antes do custo chegar.
            </p>
            <div className="landing-hero__actions">
              <ActionLink
                variant="primary"
                size="lg"
                to="/cadastro"
              >
                Cadastrar meu primeiro documento<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
              </ActionLink>
              <a className="bz-button bz-button--ghost bz-button--lg" href="#como-funciona">
                Ver como funciona
              </a>
            </div>
            <div className="landing-hero__meta" aria-label="Benefícios do plano gratuito">
              <span><Check size={15} strokeWidth={1.75} />Sem cartão</span>
              <span><Mail size={15} strokeWidth={1.75} />Alertas por e-mail</span>
              <span><ShieldCheck size={15} strokeWidth={1.75} />Um documento grátis</span>
            </div>
          </motion.div>

          <motion.div
            className="product-frame"
            initial={reduceMotion ? undefined : { opacity: 0, x: 16 }}
            animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            transition={reduceMotion ? undefined : { duration: 0.36, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
            aria-label="Prévia do painel DocLimpo"
          >
            <div className="product-frame__screen">
              <div className="product-frame__bar">
                <div className="product-frame__identity">
                  <DocumentGlyph type="outro" size="sm" />
                  <div>
                    <strong>Painel de documentos</strong>
                    <span>Exemplo de organização</span>
                  </div>
                </div>
                <span className="product-frame__signal">DEMONSTRAÇÃO</span>
              </div>

              <div className="product-frame__body">
                <div className="product-frame__headline">
                  <div>
                    <span className="bz-micro">Próximo vencimento</span>
                    <h2>Atenção onde importa</h2>
                  </div>
                  <div className="product-frame__count">05<span>dias restantes</span></div>
                </div>

                <div className="product-list">
                  {sampleDocuments.map((document, index) => (
                    <motion.div
                      className="product-list__row"
                      key={document.title}
                      {...(reduceMotion ? {} : stagger(index))}
                    >
                      <DocumentGlyph type={document.type} />
                      <div>
                        <div className="product-list__title">{document.title}</div>
                        <div className="product-list__date">{document.date}</div>
                        <StatusPill status={document.status} />
                      </div>
                      <div className="product-list__days">{document.days}<span>restantes</span></div>
                    </motion.div>
                  ))}
                </div>

                <div className="product-frame__footer">
                  <div>
                    <strong>90 · 30 · 7 · 1</strong>
                    <p>janelas de alerta configuradas</p>
                  </div>
                  <span className="bz-alert-channel"><BellRing size={14} strokeWidth={1.75} />Alertas por e-mail</span>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section className="landing-proof" aria-label="Características do produto">
          <div className="bz-container--wide landing-proof__inner">
            {productFacts.map(fact => (
              <div className="landing-proof__item" key={fact.value}>
                <div className="landing-proof__value">{fact.value}</div>
                <div className="landing-proof__label">{fact.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section--surface" id="como-funciona">
          <div className="bz-container process-layout">
            <div className="process-layout__aside">
              <span className="bz-micro">Fluxo principal</span>
              <h2>Três decisões. Depois o sistema vigia o relógio.</h2>
              <p>O produto existe para reduzir atenção operacional, não para criar mais um painel que exige manutenção diária.</p>
            </div>
            <div className="process-steps">
              {steps.map((step, index) => (
                <motion.article className="process-step" key={step.title} {...(reduceMotion ? {} : stagger(index))}>
                  <span className="process-step__number">0{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    <span className="process-step__meta"><Clock3 size={14} strokeWidth={1.75} />{step.meta}</span>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section use-cases" id="casos">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="bz-micro">Casos de uso · Do cotidiano para o painel</span>
              <h2>O mesmo cuidado.<br />Diferentes momentos da vida.</h2>
              <p>Cenários ilustrativos de uso do DocLimpo. Não são depoimentos de clientes nem resultados medidos.</p>
            </div>
            <div className="case-list">
              {useCases.map(item => <article className="case-row" key={item.type}>
                <div className="case-row__label"><span className="case-number">{item.number}</span><DocumentGlyph type={item.type} /><span className="bz-micro">{item.label}</span></div>
                <div className="case-row__story"><h3>{item.title}</h3><p>{item.context}</p></div>
                <div className="case-row__action"><span className="bz-micro">{item.detail}</span><p>{item.action}</p><Link to={`/cadastro?documento=${item.type}`}>{item.cta}<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
              </article>)}
            </div>
          </div>
        </section>

        <section className="landing-section landing-section--surface" id="gratuito">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="bz-micro">Mais antecedência, menos urgência</span>
              <h2>Esquecer sai caro. Organizar começa em zero.</h2>
              <p>O DocLimpo não renova o documento por você. Ele faz a parte que normalmente falha: colocar o prazo na sua frente antes da urgência.</p>
            </div>

            <div className="cost-layout">
              <div className="cost-table" role="table" aria-label="Planejamento por documento">
                <div className="cost-table__head" role="row">
                  <span role="columnheader">Documento e próximo passo</span>
                  <span role="columnheader">No seu dia</span>
                </div>
                {risks.map(risk => (
                  <div className="cost-table__row" role="row" key={risk.document}>
                    <div role="cell">
                      <p>{risk.document}</p>
                      <span>{risk.detail}</span>
                    </div>
                    <strong role="cell">{risk.impact}</strong>
                  </div>
                ))}
              </div>

              <aside className="cost-card">
                <span className="bz-micro">Plano gratuito</span>
                <h3>Comece pelo documento que não pode vencer.</h3>
                <p>Um prazo monitorado, alertas por e-mail e guia de renovação. Sem cartão e sem promessa escondida no rodapé.</p>
                <div className="cost-card__price">R$ 0 <span>para começar</span></div>
                <ActionLink variant="primary" size="lg" to="/cadastro">Criar conta gratuita<ArrowRight size={17} /></ActionLink>
              </aside>
            </div>
          </div>
        </section>

        <section className="landing-section" id="planos">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="bz-micro">Planos</span>
              <h2>Comece grátis. Assine quando precisar de mais.</h2>
              <p>Um documento é grátis para sempre. Para acompanhar mais, escolha um plano mensal — sem fidelidade, cancele quando quiser.</p>
            </div>
            <div className="planos-grid landing-planos" role="list" aria-label="Planos pagos">
              {PLANOS.map(plano => (
                <article className={`plano-card ${plano.destaque ? 'plano-card--destaque' : ''}`} role="listitem" key={plano.id}>
                  {plano.destaque && <span className="plano-card__selo">Mais escolhido</span>}
                  <h3>{plano.nome}</h3>
                  <p className="plano-card__descricao">{plano.descricao}</p>
                  <div className="plano-card__preco"><strong className="bz-data">{formatarPreco(plano.precoCentavos)}</strong><span>/mês</span></div>
                  <ul className="plano-card__lista">
                    {plano.beneficios.map(item => <li key={item}><Check size={14} strokeWidth={2} aria-hidden="true" />{item}</li>)}
                  </ul>
                  <ActionLink variant={plano.destaque ? 'primary' : 'secondary'} size="md" to="/cadastro">Começar grátis<ArrowRight size={16} /></ActionLink>
                </article>
              ))}
            </div>
            <p className="planos-nota">Pagamento pelo Stripe. Desistência em até 7 dias com devolução integral (CDC). Detalhes nos <Link to="/termos">termos de uso</Link>.</p>
          </div>
        </section>

        <section className="landing-section" id="perguntas">
          <div className="bz-container faq-layout">
            <div className="faq-intro"><span className="bz-micro">Perguntas frequentes</span><h2>Antes de começar,<br />o essencial.</h2><p>Cinco respostas sobre o que o DocLimpo faz — e o que continua com você.</p><Link className="text-link" to="/privacidade">Entenda o uso dos seus dados<ArrowUpRight size={15} /></Link></div>
            <div className="faq-list">{faqs.map((item, index) => <details className="faq-item" key={item.question} id={`pergunta-${index + 1}`}><summary><span className="faq-number">0{index + 1}</span><span>{item.question}</span><ChevronDown size={18} aria-hidden="true" /></summary><div className="faq-answer"><p>{item.answer}</p>{index === 4 && <Link to="/privacidade">Ler a política de privacidade</Link>}</div></details>)}</div>
          </div>
        </section>

        <section className="bz-container support-strip" id="atendimento" aria-label="Atendimento">
          <Clock3 size={23} strokeWidth={1.5} aria-hidden="true" />
          <div><span className="bz-micro">Atendimento humano</span><h2>{support.email && support.responseTime ? `Primeira resposta em ${support.responseTime}.` : 'Prazo de resposta em definição.'}</h2><p>{support.email && support.responseTime ? 'Prazo para o primeiro retorno, não para a resolução. Conte o que aconteceu sem enviar senhas ou cópias de documentos.' : 'O canal oficial e o prazo de atendimento serão informados aqui após confirmação. Enquanto isso, consulte as perguntas acima.'}</p></div>
          {support.email ? <a className="text-link" href={`mailto:${support.email}`}>Falar com o DocLimpo<ArrowUpRight size={16} /></a> : <a className="text-link" href="#perguntas">Consultar perguntas<ArrowUpRight size={16} /></a>}
        </section>

        <section className="landing-final">
          <div className="bz-container landing-final__panel">
            <div>
              <span className="bz-micro">Seu próximo prazo</span>
              <h2>Cadastre agora. Esqueça de lembrar depois.</h2>
              <p>Escolha um vencimento, crie sua conta e deixe o primeiro prazo organizado. Gratuito, sem cartão.</p>
            </div>
            <ActionLink
              variant="primary"
              size="lg"
              to="/cadastro"
            >
              Criar minha conta gratuita<ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
            </ActionLink>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="bz-container landing-footer__inner">
          <Link className="brand-link" to="/"><Brand /></Link>
          <span className="landing-footer__meta">Alertas de vencimento para documentos brasileiros.</span>
          <nav className="landing-footer__links" aria-label="Rodapé">
            <a href="#casos">Casos de uso</a>
            <a href="#perguntas">Perguntas</a>
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
