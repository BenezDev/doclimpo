import { Link } from 'react-router-dom'
import { Brand } from './Bezel'
import { documentoPublicoPorSlug } from '../../lib/documentos-publicos'
import { support } from '../../lib/public-content'

const docsDoCarro = ['cnh', 'crlv', 'ipva', 'multa', 'seguro']
const outrosDocs = ['passaporte', 'rg', 'plano-de-saude']

function linksDe(slugs: string[]) {
  return slugs.flatMap(slug => {
    const documento = documentoPublicoPorSlug(slug)
    return documento ? [{ to: `/documentos/${slug}`, rotulo: documento.nome }] : []
  })
}

// Rodapé das páginas públicas (landing e PublicShell). A linha institucional
// só mostra razão social e CNPJ quando `support.cnpj` estiver preenchido.
export function SiteFooter() {
  const colunas = [
    { titulo: 'Produto', links: [{ to: '/#como-funciona', rotulo: 'Como funciona' }, { to: '/#planos', rotulo: 'Planos' }, { to: '/#perguntas', rotulo: 'Perguntas frequentes' }, { to: '/cadastro', rotulo: 'Criar conta grátis' }] },
    { titulo: 'Para o carro', links: linksDe(docsDoCarro) },
    { titulo: 'Outros documentos', links: [...linksDe(outrosDocs), { to: '/documentos', rotulo: 'Todos os documentos' }] },
    { titulo: 'DocLimpo', links: [{ to: '/sobre', rotulo: 'Sobre' }, { to: '/seguranca', rotulo: 'Segurança' }, { to: '/privacidade', rotulo: 'Privacidade' }, { to: '/termos', rotulo: 'Termos de uso' }] },
  ]

  return (
    <footer className="site-footer">
      <div className="bz-container site-footer__grid">
        <div className="site-footer__brand">
          <Link className="brand-link" to="/" aria-label="DocLimpo — início"><Brand /></Link>
          <p>Avisa antes de vencer. Para quem dirige e para quem não quer decorar data.</p>
          {support.email && <a className="site-footer__contact" href={`mailto:${support.email}`}>{support.email}</a>}
        </div>
        {colunas.map(coluna => (
          <nav className="site-footer__column" aria-label={coluna.titulo} key={coluna.titulo}>
            <span className="site-footer__title">{coluna.titulo}</span>
            {coluna.links.map(link => <Link key={link.to} to={link.to}>{link.rotulo}</Link>)}
          </nav>
        ))}
      </div>
      <div className="bz-container site-footer__legal">
        <span>© {new Date().getFullYear()} DocLimpo</span>
        {support.cnpj && support.controller && <span>{support.controller} · CNPJ {support.cnpj}</span>}
        <span>O DocLimpo não é ligado a Detran, SENATRAN ou qualquer órgão público.</span>
      </div>
    </footer>
  )
}
