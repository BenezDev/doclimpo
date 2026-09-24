import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DocumentGlyph } from '../components/ui/Bezel'
import { PublicShell } from '../components/ui/PublicShell'
import { DOCUMENTOS_PUBLICOS } from '../lib/documentos-publicos'

// /documentos: índice das páginas públicas por tipo.
export default function DocumentosHub() {
  return (
    <PublicShell>
      <header className="privacy-heading">
        <span className="bz-micro">Guia</span>
        <h1>Documentos e prazos.</h1>
        <p>Quanto tempo vale cada documento, onde renovar e como receber aviso antes de vencer.</p>
      </header>
      <ul className="documentos-hub" aria-label="Documentos">
        {DOCUMENTOS_PUBLICOS.map(item => (
          <li key={item.slug}>
            <Link className="documentos-hub__card" to={`/documentos/${item.slug}`}>
              <DocumentGlyph type={item.tipo} />
              <span>
                <strong>{item.nome}</strong>
                <small>{item.descricao}</small>
              </span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </PublicShell>
  )
}
