import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Brand, ThemeToggle } from './Bezel'
import { ActionLink } from './ActionLink'
import { SiteFooter } from './SiteFooter'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'

export function PublicShell({ children }: { children: ReactNode }) {
  const { dark, toggleTheme } = useTheme()
  const { user } = useAuth()
  return (
    <div className="bz-page public-page">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header className="bz-topbar">
        <div className="bz-container bz-topbar__inner">
          <Link to="/" className="brand-link" aria-label="DocLimpo — início"><Brand /></Link>
          <nav className="site-nav" aria-label="Principal">
            <Link to="/#como-funciona">Como funciona</Link>
            <Link to="/documentos">Documentos</Link>
            <Link to="/#planos">Planos</Link>
          </nav>
          <div className="bz-topbar__actions">
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
            {user
              ? <ActionLink to="/dashboard" variant="primary">Meu painel</ActionLink>
              : <>
                <ActionLink to="/login" variant="ghost">Entrar</ActionLink>
                <ActionLink to="/cadastro" variant="primary">Começar grátis</ActionLink>
              </>}
          </div>
        </div>
      </header>
      <main id="conteudo" className="bz-container public-main">{children}</main>
      <SiteFooter />
    </div>
  )
}
