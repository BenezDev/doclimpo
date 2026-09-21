import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand, ThemeToggle } from './Bezel'
import { ActionLink } from './ActionLink'
import { useTheme } from '../../hooks/useTheme'

export function PublicShell({ children }: { children: ReactNode }) {
  const { dark, toggleTheme } = useTheme()
  return (
    <div className="bz-page public-page">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="bz-topbar">
        <div className="bz-container bz-topbar__inner">
          <Link to="/" className="brand-link" aria-label="DocLimpo — início"><Brand /></Link>
          <div className="bz-topbar__actions">
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
            <ActionLink to="/login" variant="ghost">Entrar</ActionLink>
          </div>
        </div>
      </header>
      <main id="conteudo" className="bz-container public-main">{children}</main>
      <footer className="landing-footer">
        <div className="bz-container landing-footer__inner">
          <Link className="brand-link" to="/"><Brand /></Link>
          <span className="landing-footer__meta">Menos urgência. Mais antecedência.</span>
          <nav className="landing-footer__links" aria-label="Rodapé">
            <Link to="/documentos">Documentos</Link>
            <Link to="/#perguntas">Perguntas frequentes</Link>
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/termos">Termos</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
