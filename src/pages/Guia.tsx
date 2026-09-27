import { ArrowRight, ArrowUpRight, Calculator, ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ActionLink } from '../components/ui/ActionLink'
import { DocumentGlyph } from '../components/ui/Bezel'
import { PublicShell } from '../components/ui/PublicShell'
import { formatarData } from '../lib/datas'
import { GUIAS, guiaPorSlug } from '../lib/guias'
import NotFound from './NotFound'

// Guia público (/guias/<slug>): conteúdo estático de src/lib/guias.ts, com a
// fonte oficial de cada regra. Slug desconhecido cai na 404.
export default function Guia() {
  const { slug } = useParams()
  const guia = slug ? guiaPorSlug(slug) : null
  if (!guia) return <NotFound />

  const outros = GUIAS.filter(item => item.slug !== guia.slug)
  const indice = [...guia.secoes.map(secao => [secao.id, secao.titulo]), ['perguntas', 'Perguntas'], ['fontes', 'Fontes oficiais']]

  return (
    <PublicShell>
      <header className="privacy-heading documento-publico__heading">
        <DocumentGlyph type={guia.tipo} size="lg" />
        <div>
          <span className="bz-micro">Guia · <Link to="/guias">Guias para quem dirige</Link></span>
          <h1>{guia.h1}</h1>
          <p>{guia.resumo}</p>
          <div className="outcome-actions">
            <ActionLink to={`/cadastro?documento=${guia.tipo}`} variant="primary" size="lg">{guia.cta}<ArrowRight size={17} aria-hidden="true" /></ActionLink>
            {guia.ferramenta && <ActionLink to={guia.ferramenta.to} variant="secondary" size="lg"><Calculator size={17} aria-hidden="true" />{guia.ferramenta.rotulo}</ActionLink>}
          </div>
          <span className="privacy-version">Atualizado em {formatarData(guia.atualizadoEm)}</span>
        </div>
      </header>
      <div className="privacy-layout">
        <nav className="privacy-index" aria-label="Neste guia">
          <span className="bz-micro">Neste guia</span>
          {indice.map(([id, rotulo]) => <a key={id} href={`#${id}`}>{rotulo}</a>)}
        </nav>
        <article className="privacy-body">
          {guia.secoes.map(secao => (
            <section id={secao.id} key={secao.id}>
              <h2>{secao.titulo}</h2>
              {secao.paragrafos.map(paragrafo => <p key={paragrafo}>{paragrafo}</p>)}
            </section>
          ))}
          <section id="perguntas">
            <h2>Perguntas</h2>
            <dl>
              {guia.faqs.map(item => <div key={item.pergunta}><dt>{item.pergunta}</dt><dd>{item.resposta}</dd></div>)}
            </dl>
          </section>
          <section id="fontes">
            <h2>Fontes oficiais</h2>
            <ul className="documento-publico__links">
              {guia.fontes.map(fonte => (
                <li key={fonte.url}>
                  <a href={fonte.url} target="_blank" rel="noopener noreferrer">{fonte.rotulo}<ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" /></a>
                  <small>Consultado em {formatarData(fonte.verificadoEm)}. Leis e regras mudam: confira no órgão antes de contar com uma data.</small>
                </li>
              ))}
            </ul>
          </section>
          <section aria-label="Outros guias">
            <h2>Outros guias</h2>
            <ul className="documento-publico__outros">
              {outros.map(item => <li key={item.slug}><Link to={`/guias/${item.slug}`}>{item.h1.replace(/\.$/, '')}<ArrowUpRight size={14} aria-hidden="true" /></Link></li>)}
            </ul>
          </section>
        </article>
      </div>
    </PublicShell>
  )
}
