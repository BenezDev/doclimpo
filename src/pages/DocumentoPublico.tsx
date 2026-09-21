import { ArrowRight, ArrowUpRight, ExternalLink } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ActionLink } from '../components/ui/ActionLink'
import { DocumentGlyph } from '../components/ui/Bezel'
import { PublicShell } from '../components/ui/PublicShell'
import { DOCUMENTOS_PUBLICOS, documentoPublicoPorSlug } from '../lib/documentos-publicos'
import { JANELAS_ALERTA } from '../lib/planos'
import NotFound from './NotFound'

const sections = [
  ['o-que-e', 'O que é'],
  ['validade', 'Quanto tempo vale'],
  ['renovar', 'Onde renovar'],
  ['alertas', 'Como o DocLimpo avisa'],
  ['perguntas', 'Perguntas'],
]

// Página pública por tipo de documento (/documentos/<tipo>): conteúdo
// estático de src/lib/documentos-publicos.ts, sem backend. Slug desconhecido
// cai na 404 (e o build só gera HTML para os slugs conhecidos).
export default function DocumentoPublico() {
  const { tipo } = useParams()
  const documento = tipo ? documentoPublicoPorSlug(tipo) : null
  if (!documento) return <NotFound />

  const outros = DOCUMENTOS_PUBLICOS.filter(item => item.slug !== documento.slug).slice(0, 4)

  return (
    <PublicShell>
      <header className="privacy-heading documento-publico__heading">
        <DocumentGlyph type={documento.slug} size="lg" />
        <div>
          <span className="bz-micro">Guia · <Link to="/documentos">Documentos</Link></span>
          <h1>{documento.nome}: validade, renovação e alerta de vencimento.</h1>
          <p>{documento.descricao}</p>
          <div className="outcome-actions">
            <ActionLink to={`/cadastro?documento=${documento.slug}`} variant="primary" size="lg">Acompanhar meu {documento.nome.split(' ')[0]}<ArrowRight size={17} aria-hidden="true" /></ActionLink>
          </div>
        </div>
      </header>
      <div className="privacy-layout">
        <nav className="privacy-index" aria-label="Nesta página">
          <span className="bz-micro">Nesta página</span>
          {sections.map(([id, label], index) => <a key={id} href={`#${id}`}><span>0{index + 1}</span>{label}</a>)}
        </nav>
        <article className="privacy-body">
          <section id="o-que-e"><h2>01. O que é</h2><p>{documento.oQueE}</p></section>
          <section id="validade"><h2>02. Quanto tempo vale</h2><p>{documento.validade}</p><p><small>Prazos e regras podem mudar. Confira no órgão responsável antes de contar com a data.</small></p></section>
          <section id="renovar">
            <h2>03. Onde renovar</h2>
            <p>{documento.comoRenovar}</p>
            <dl>
              <dt>Responsável</dt>
              <dd>{documento.autoridade.orgao}</dd>
              {documento.autoridade.observacao && <><dt>Observação</dt><dd>{documento.autoridade.observacao}</dd></>}
              {documento.autoridade.portalUrl && (
                <><dt>Portal oficial</dt><dd><a href={documento.autoridade.portalUrl} target="_blank" rel="noopener noreferrer">{documento.autoridade.portalUrl}<ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" /></a></dd></>
              )}
            </dl>
          </section>
          <section id="alertas">
            <h2>04. Como o DocLimpo avisa</h2>
            <p>Você cadastra o tipo e a data de vencimento (sem foto, sem número do documento). O DocLimpo envia um e-mail {JANELAS_ALERTA.join(', ')} dias antes e, nos planos pagos, também uma notificação no navegador. Na tela do documento você vê onde renovar e pode marcar como renovado com o próximo prazo.</p>
            <p>O DocLimpo não renova documentos, não paga taxas e não consulta órgãos públicos: a data informada por você é a referência.</p>
          </section>
          <section id="perguntas">
            <h2>05. Perguntas</h2>
            <dl>
              {documento.faqs.map(item => <div key={item.pergunta}><dt>{item.pergunta}</dt><dd>{item.resposta}</dd></div>)}
            </dl>
          </section>
          <section aria-label="Outros documentos">
            <h2>Outros documentos</h2>
            <ul className="documento-publico__outros">
              {outros.map(item => <li key={item.slug}><Link to={`/documentos/${item.slug}`}>{item.nome}<ArrowUpRight size={14} aria-hidden="true" /></Link></li>)}
            </ul>
          </section>
          <Link className="text-link" to="/">Voltar ao DocLimpo</Link>
        </article>
      </div>
    </PublicShell>
  )
}
