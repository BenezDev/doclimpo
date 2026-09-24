import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Check,
  ChevronDown,
  ExternalLink,
  FileX2,
  KeyRound,
  Mail,
  MapPin,
  ShieldCheck,
  Siren,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandMark, Brand, DocumentGlyph, StatusPill, ThemeToggle } from '../components/ui/Bezel'
import { ActionLink } from '../components/ui/ActionLink'
import { Placa } from '../components/ui/Placa'
import { SiteFooter } from '../components/ui/SiteFooter'
import { CUSTO_DE_ESQUECER } from '../data/custo-de-esquecer'
import { useTheme } from '../hooks/useTheme'
import { JANELAS_ALERTA, LIMITE_DOCUMENTOS_FREE, PLANOS, formatarPreco, type PlanoSlug } from '../lib/planos'
import { faqs, withIntent } from '../lib/public-content'

const janelas = `${JANELAS_ALERTA.slice(0, -1).join(', ')} e ${JANELAS_ALERTA[JANELAS_ALERTA.length - 1]}`

const canaisOficiais = ['Detran do seu estado', 'gov.br', 'Portal SENATRAN', 'SNE', 'Polícia Federal']

const passos = [
  { titulo: 'Cadastre em um minuto', texto: 'Escolha o documento e informe a data de vencimento. A placa é opcional. Não pedimos foto nem CPF.' },
  { titulo: 'O DocLimpo conta os dias', texto: `A partir da data, os avisos ficam programados para ${janelas} dias antes. Você não precisa fazer mais nada.` },
  { titulo: 'O aviso chega, você resolve', texto: 'Cada aviso traz o prazo que falta e o link do órgão certo para renovar ou pagar, no seu estado.' },
]

const tambem = ['Passaporte', 'RG e CIN', 'Seguro auto', 'Plano de saúde', 'Garantia', 'Contrato e aluguel', 'Exame periódico']

const naoPedimos = [
  { icon: FileX2, titulo: 'Sem foto do documento', texto: 'Para avisar, basta o tipo e a data. Nada de upload, nada de número do documento.' },
  { icon: KeyRound, titulo: 'Sem CPF e sem senha do gov.br', texto: 'Você entra no órgão oficial com o seu login. O DocLimpo só mostra o caminho.' },
  { icon: ShieldCheck, titulo: 'Cartão fora do DocLimpo', texto: 'O pagamento da assinatura é feito na Cakto. Os dados do cartão nunca passam por aqui.' },
]

function dataDeHoje() {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())
}

export default function Landing() {
  const { hash, search } = useLocation()
  const { dark, toggleTheme } = useTheme()
  const cadastro = withIntent('/cadastro', search)
  const login = withIntent('/login', search)
  const cadastroCom = (chave: 'documento' | 'plano', valor: string) => {
    const params = new URLSearchParams(search)
    params.set(chave, valor)
    return withIntent('/cadastro', `?${params}`)
  }
  const escolherPlano = (slug: PlanoSlug) => cadastroCom('plano', slug)

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'instant' })
  }, [hash])

  return (
    <div className="bz-page landing-page">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="bz-topbar">
        <div className="bz-container bz-topbar__inner">
          <Link className="brand-link" to="/" aria-label="DocLimpo — início"><Brand /></Link>
          <nav className="site-nav" aria-label="Seções da página">
            <a href="#como-funciona">Como funciona</a>
            <Link to="/documentos">Documentos</Link>
            <a href="#planos">Planos</a>
            <a href="#perguntas">Perguntas</a>
          </nav>
          <div className="bz-topbar__actions">
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
            <ActionLink variant="ghost" to={login}>Entrar</ActionLink>
            <ActionLink variant="primary" to={cadastro}>Começar grátis</ActionLink>
          </div>
        </div>
      </header>

      <main id="conteudo">
        <section className="bz-container landing-hero" aria-labelledby="titulo">
          <div className="landing-hero__copy">
            <span className="landing-eyebrow">Para quem dirige</span>
            <h1 id="titulo">CNH, IPVA e multa em dia. <em>Sem susto.</em></h1>
            <p className="landing-hero__lead">
              O DocLimpo avisa {janelas} dias antes de vencer e mostra onde resolver no seu estado.
              Começa com um documento grátis.
            </p>
            <div className="landing-hero__actions">
              <ActionLink variant="primary" size="lg" to={cadastro}>Começar grátis<ArrowRight size={18} strokeWidth={2} aria-hidden="true" /></ActionLink>
              <a className="bz-button bz-button--secondary bz-button--lg" href="#como-funciona">Ver como funciona</a>
            </div>
            <ul className="landing-trust" aria-label="Condições">
              <li><Check size={15} strokeWidth={2.25} aria-hidden="true" />Sem cartão</li>
              <li><Check size={15} strokeWidth={2.25} aria-hidden="true" />Sem foto do documento</li>
              <li><Check size={15} strokeWidth={2.25} aria-hidden="true" />Cancele quando quiser</li>
            </ul>
          </div>

          <div className="landing-phone" role="img" aria-label="Ilustração: celular recebendo avisos do DocLimpo sobre a CNH e o licenciamento">
            <div className="landing-phone__device" aria-hidden="true">
              <div className="landing-phone__screen">
                <span className="landing-phone__clock">9:41</span>
                <span className="landing-phone__date">{dataDeHoje()}</span>
                <div className="landing-notif">
                  <BrandMark className="landing-notif__icon" />
                  <div>
                    <span className="landing-notif__top"><span>DocLimpo</span><span>agora</span></span>
                    <strong>Sua CNH vence em 30 dias</strong>
                    <span>Dá tempo de renovar sem correria. Veja onde fazer no seu estado.</span>
                  </div>
                </div>
                <div className="landing-notif landing-notif--email">
                  <Mail className="landing-notif__icon landing-notif__icon--mail" size={18} strokeWidth={2} />
                  <div>
                    <span className="landing-notif__top"><span>E-mail · DocLimpo</span><span>9:00</span></span>
                    <strong>Licenciamento do carro: faltam 7 dias</strong>
                    <span>Pague e baixe o CRLV digital no Detran.</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="landing-phone__card" aria-hidden="true">
              <Placa placa="DOC1L25" />
              <div className="landing-phone__line"><span>Licenciamento</span><StatusPill status="critico" label="7 dias" /></div>
              <div className="landing-phone__line"><span>IPVA</span><StatusPill status="vigente" label="em dia" /></div>
            </div>
          </div>
        </section>

        <section className="landing-oficial" aria-labelledby="oficial-titulo">
          <div className="bz-container landing-oficial__inner">
            <span id="oficial-titulo">Leva você direto aos canais oficiais</span>
            <ul>{canaisOficiais.map(canal => <li key={canal}>{canal}</li>)}</ul>
          </div>
        </section>

        <section className="landing-section landing-section--asfalto" id="custo" aria-labelledby="custo-titulo">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="landing-kicker">Por que avisar antes</span>
              <h2 id="custo-titulo">Esquecer a data sai caro.</h2>
              <p>O que o Código de Trânsito prevê quando um prazo do carro passa:</p>
            </div>
            <ul className="landing-custos">
              {CUSTO_DE_ESQUECER.map(item => (
                <li className="landing-custo" key={item.tipo}>
                  <DocumentGlyph type={item.tipo} />
                  <h3>{item.titulo}</h3>
                  <p>{item.consequencia}</p>
                  <a href={item.fonte} target="_blank" rel="noopener noreferrer">{item.artigo}<ExternalLink size={12} strokeWidth={2} aria-hidden="true" /></a>
                </li>
              ))}
            </ul>
            <div className="landing-custo__cta">
              <ActionLink variant="primary" size="lg" to={cadastroCom('documento', 'cnh')}>Acompanhar minha CNH grátis<ArrowRight size={18} strokeWidth={2} aria-hidden="true" /></ActionLink>
            </div>
          </div>
        </section>

        <section className="landing-section" id="como-funciona" aria-labelledby="como-funciona-titulo">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="landing-kicker">Como funciona</span>
              <h2 id="como-funciona-titulo">Você cadastra uma vez. O aviso chega sozinho.</h2>
            </div>
            <ol className="landing-passos">
              {passos.map((passo, index) => (
                <li key={passo.titulo}>
                  <span className="landing-passos__numero" aria-hidden="true">{index + 1}</span>
                  <h3>{passo.titulo}</h3>
                  <p>{passo.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="landing-section landing-section--surface" aria-labelledby="recursos-titulo">
          <div className="bz-container">
            <h2 className="bz-sr-only" id="recursos-titulo">O que o DocLimpo faz</h2>

            <article className="landing-row">
              <div className="landing-row__copy">
                <span className="landing-kicker">Seu carro pela placa</span>
                <h3>IPVA e licenciamento no calendário do seu estado.</h3>
                <p>Cadastre a placa e a UF. O DocLimpo usa o final da placa para sugerir as datas de IPVA e licenciamento, quando o estado já publicou o calendário, e reúne os links oficiais para consultar multas.</p>
                <Link className="landing-row__link" to={cadastroCom('documento', 'ipva')}>Acompanhar meu IPVA<ArrowUpRight size={16} aria-hidden="true" /></Link>
              </div>
              <div className="landing-row__visual landing-carro" aria-hidden="true">
                <Placa placa="DOC1L25" size="lg" />
                <ul>
                  <li><DocumentGlyph type="ipva" size="sm" /><span>IPVA · cota única</span><StatusPill status="vigente" label="em dia" /></li>
                  <li><DocumentGlyph type="crlv" size="sm" /><span>Licenciamento</span><StatusPill status="atencao" label="30 dias" /></li>
                  <li><DocumentGlyph type="multa" size="sm" /><span>Multas no Detran e na SENATRAN</span><ExternalLink size={14} /></li>
                </ul>
              </div>
            </article>

            <article className="landing-row landing-row--reverse">
              <div className="landing-row__copy">
                <span className="landing-kicker">Multa com prazo contado</span>
                <h3>Não perca o prazo de defesa nem o desconto.</h3>
                <p>Cadastre a data da notificação. O DocLimpo calcula o prazo mínimo que o CTB garante para defesa ou indicação do condutor, avisa antes de acabar e mostra onde consultar e pagar, inclusive a adesão ao SNE, que pode dar 40% de desconto.</p>
                <Link className="landing-row__link" to={cadastroCom('documento', 'multa')}>Acompanhar minha multa<ArrowUpRight size={16} aria-hidden="true" /></Link>
              </div>
              <div className="landing-row__visual landing-linha" aria-hidden="true">
                <div className="landing-linha__passo"><Siren size={18} /><div><strong>Notificação recebida</strong><span>dia 0</span></div></div>
                <div className="landing-linha__passo landing-linha__passo--alerta"><BellRing size={18} /><div><strong>Aviso do DocLimpo</strong><span>7 e 1 dia antes do prazo</span></div></div>
                <div className="landing-linha__passo"><Check size={18} /><div><strong>Fim do prazo de defesa</strong><span>pelo menos 30 dias</span></div></div>
              </div>
            </article>

            <article className="landing-row">
              <div className="landing-row__copy">
                <span className="landing-kicker">Avisos onde você vê</span>
                <h3>No e-mail sempre. No celular, se quiser.</h3>
                <p>Todo plano recebe os avisos por e-mail. Nos planos pagos, o mesmo aviso chega também como notificação no celular ou no computador. Cada documento mostra o órgão responsável e, com o seu CEP, a unidade mais perto.</p>
              </div>
              <div className="landing-row__visual landing-avisos" aria-hidden="true">
                <div className="landing-aviso"><Mail size={18} /><div><strong>Seu passaporte vence em 90 dias</strong><span>E-mail · Polícia Federal: agende pelo site</span></div></div>
                <div className="landing-aviso"><BellRing size={18} /><div><strong>Seguro do carro: faltam 7 dias</strong><span>Notificação · converse com sua seguradora</span></div></div>
                <div className="landing-aviso"><MapPin size={18} /><div><strong>Onde renovar a CNH</strong><span>Detran do seu estado · unidade mais perto do seu CEP</span></div></div>
              </div>
            </article>

            <div className="landing-tambem">
              <div>
                <span className="landing-kicker">E também</span>
                <h3>O resto da vida cabe no mesmo painel.</h3>
                <p>Do plano MEI saem alvará, certidões e DAS. No plano Família, até 4 pessoas, cada uma com a própria conta.</p>
              </div>
              <ul>{tambem.map(item => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="privacidade-titulo">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="landing-kicker">Privacidade</span>
              <h2 id="privacidade-titulo">A gente não pede o que não precisa.</h2>
            </div>
            <ul className="landing-promessas">
              {naoPedimos.map(item => (
                <li key={item.titulo}>
                  <item.icon size={22} strokeWidth={1.75} aria-hidden="true" />
                  <h3>{item.titulo}</h3>
                  <p>{item.texto}</p>
                </li>
              ))}
            </ul>
            <Link className="landing-row__link" to="/seguranca">Como protegemos seus dados<ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="landing-section landing-section--surface" id="planos" aria-labelledby="planos-titulo">
          <div className="bz-container">
            <div className="landing-section__header">
              <span className="landing-kicker">Planos</span>
              <h2 id="planos-titulo">Comece grátis. Assine quando quiser mais.</h2>
              <p>Sem fidelidade: cancele quando quiser, direto na sua conta.</p>
            </div>
            <div className="landing-free" id="gratuito">
              <div>
                <h3>Grátis <span className="bz-data">{formatarPreco(0)}</span></h3>
                <p>{LIMITE_DOCUMENTOS_FREE} documento com avisos por e-mail e onde renovar. Sem cartão.</p>
              </div>
              <ActionLink variant="secondary" size="md" to={cadastro}>Começar grátis<ArrowRight size={16} aria-hidden="true" /></ActionLink>
            </div>
            <div className="planos-grid landing-planos" role="list" aria-label="Planos pagos">
              {PLANOS.map(plano => (
                <article className={`plano-card${plano.destaque ? ' plano-card--destaque' : ''}`} role="listitem" key={plano.id}>
                  {plano.destaque && <span className="plano-card__selo">Mais escolhido</span>}
                  <h3>{plano.nome}</h3>
                  <p className="plano-card__descricao">{plano.descricao}</p>
                  <div className="plano-card__preco"><strong className="bz-data">{formatarPreco(plano.precoCentavos)}</strong><span>/mês</span></div>
                  <ul className="plano-card__lista">
                    {plano.beneficios.map(item => <li key={item}><Check size={14} strokeWidth={2.25} aria-hidden="true" />{item}</li>)}
                  </ul>
                  <ActionLink variant={plano.destaque ? 'primary' : 'secondary'} size="md" to={escolherPlano(plano.slug)}>Escolher {plano.nome}<ArrowRight size={16} aria-hidden="true" /></ActionLink>
                </article>
              ))}
            </div>
            <p className="planos-nota">Você cria a conta e assina logo depois, pela Cakto, no cartão ou no Pix Automático. Desistência em até 7 dias com devolução integral. Detalhes nos <Link to="/termos">termos de uso</Link>.</p>
          </div>
        </section>

        <section className="landing-section" id="perguntas" aria-labelledby="perguntas-titulo">
          <div className="bz-container landing-faq">
            <div className="landing-section__header">
              <span className="landing-kicker">Perguntas frequentes</span>
              <h2 id="perguntas-titulo">Antes de começar.</h2>
            </div>
            <div className="faq-list">
              {faqs.map((item, index) => (
                <details className="faq-item" key={item.question} id={`pergunta-${index + 1}`}>
                  <summary><span>{item.question}</span><ChevronDown size={18} aria-hidden="true" /></summary>
                  <div className="faq-answer"><p>{item.answer}</p></div>
                </details>
              ))}
            </div>
            <p className="landing-faq__mais">Ficou alguma dúvida? <Link to="/sobre#contato">Fale com a gente</Link>.</p>
          </div>
        </section>

        <section className="landing-cta" aria-labelledby="cta-titulo">
          <div className="bz-container landing-cta__panel">
            <div>
              <h2 id="cta-titulo">Comece pelo documento que não pode vencer.</h2>
              <p>Um documento grátis, avisos por e-mail e nenhum cartão.</p>
            </div>
            <ActionLink variant="primary" size="lg" to={cadastro}>Começar grátis<ArrowRight size={18} strokeWidth={2} aria-hidden="true" /></ActionLink>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
