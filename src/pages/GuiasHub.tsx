import { ArrowUpRight, Calculator } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DocumentGlyph } from '../components/ui/Bezel'
import { PublicShell } from '../components/ui/PublicShell'
import { CALCULADORAS, GUIAS } from '../lib/guias'

// /guias: calculadoras grátis e guias com as regras do Código de Trânsito.
export default function GuiasHub() {
  return (
    <PublicShell>
      <header className="privacy-heading">
        <span className="bz-micro">Guias e calculadoras</span>
        <h1>Prazos do carro, sem juridiquês.</h1>
        <p>Calcule a validade da CNH e o prazo da multa, e entenda o que a lei diz sobre cada vencimento. Grátis, com a fonte oficial de cada regra.</p>
      </header>
      <section aria-labelledby="calculadoras-titulo">
        <h2 className="guias-hub__titulo" id="calculadoras-titulo">Calculadoras</h2>
        <ul className="documentos-hub">
          {CALCULADORAS.map(item => (
            <li key={item.path}>
              <Link className="documentos-hub__card" to={item.path}>
                <span className="bz-document-glyph bz-document-glyph--md" aria-hidden="true"><Calculator size={20} strokeWidth={1.75} /></span>
                <span><strong>{item.nome}</strong><small>{item.descricao}</small></span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="guias-titulo">
        <h2 className="guias-hub__titulo" id="guias-titulo">Guias</h2>
        <ul className="documentos-hub">
          {GUIAS.map(guia => (
            <li key={guia.slug}>
              <Link className="documentos-hub__card" to={`/guias/${guia.slug}`}>
                <DocumentGlyph type={guia.tipo} />
                <span><strong>{guia.h1.replace(/\.$/, '')}</strong><small>{guia.resumo}</small></span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className="guias-hub__mais">Procurando a validade de outro documento? Veja os <Link to="/documentos">guias por documento</Link>.</p>
    </PublicShell>
  )
}
