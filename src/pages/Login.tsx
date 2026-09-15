import { motion, useReducedMotion } from 'framer-motion'
import { BellRing, CircleAlert, FileText, LockKeyhole, MailCheck, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Brand, Button, ThemeToggle } from '../components/ui/Bezel'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../integrations/supabase/client'
import { bezelSpring, fadeUp } from '../lib/motion'
import { useAuth } from '../hooks/useAuth'
import { documentIntent, withDocumentIntent } from '../lib/public-content'
import { requestPasswordReset, submitAccess } from '../lib/access-flow'

const accessBenefits = [
  {
    icon: FileText,
    title: 'Documentos em um único lugar',
    description: 'CNH, CRLV, passaporte, IPVA e outros prazos.',
  },
  {
    icon: BellRing,
    title: 'Alertas antes do vencimento',
    description: 'Janelas de 90, 30, 7 e 1 dia por e-mail.',
  },
  {
    icon: ShieldCheck,
    title: 'Acesso isolado por usuário',
    description: 'Cada conta enxerga somente os próprios documentos.',
  },
]

export default function Login({ isCadastro = false }: { isCadastro?: boolean }) {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { user, loading: authLoading } = useAuth()
  const reduceMotion = useReducedMotion()
  const { dark, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [recuperando, setRecuperando] = useState(false)
  const [linkEnviado, setLinkEnviado] = useState(false)

  const selectMode = (cadastro: boolean) => {
    navigate(withDocumentIntent(cadastro ? '/cadastro' : '/login', search))
    setErro('')
    setRecuperando(false)
    setLinkEnviado(false)
  }

  const handleRecuperar = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setErro('')
    const result = await requestPasswordReset(supabase.auth, { email, origin: window.location.origin })
    setLoading(false)
    if ('error' in result) setErro(result.error)
    else setLinkEnviado(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setErro('')

    const result = await submitAccess(supabase.auth, { signup: isCadastro, email, password: senha, name: nome, search })
    if ('error' in result) {
      setErro(result.error)
      setLoading(false)
    } else {
      // Keep the auth guard suspended until the lazy destination commits.
      navigate(result.to, { replace: true, state: result.state })
    }
  }

  if (user && !loading) return <Navigate to={withDocumentIntent(documentIntent(search) ? '/onboarding' : '/dashboard', search)} replace />

  return (
    <div className="bz-page auth-page">
      <header className="auth-topbar">
        <div className="bz-container--wide auth-topbar__inner">
          <Link className="auth-brand-button brand-link" to="/" aria-label="Voltar para a página inicial">
            <Brand />
          </Link>
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
        </div>
      </header>

      <div className="auth-layout">
        <main className="auth-main">
          <motion.div className="auth-main__inner" {...(reduceMotion ? {} : fadeUp)}>
            <div className="auth-intro">
              <span className="bz-micro">Acesso seguro</span>
              <h1>{recuperando ? 'Recupere seu acesso.' : isCadastro ? 'Crie sua conta.' : 'Continue de onde parou.'}</h1>
              <p>{recuperando ? 'Enviamos um link para você definir uma nova senha.' : isCadastro ? 'O primeiro documento é gratuito. Sem cartão.' : 'Entre para consultar seus próximos vencimentos.'}</p>
            </div>

            <div className="auth-panel">
              <div className="auth-segment" aria-label="Escolha entre entrar e criar conta">
                <button type="button" disabled={loading} onClick={() => selectMode(false)} aria-pressed={!isCadastro}>
                  {!isCadastro && <motion.span className="auth-segment__active" layoutId="auth-mode" transition={bezelSpring} />}
                  <span>Entrar</span>
                </button>
                <button type="button" disabled={loading} onClick={() => selectMode(true)} aria-pressed={isCadastro}>
                  {isCadastro && <motion.span className="auth-segment__active" layoutId="auth-mode" transition={bezelSpring} />}
                  <span>Criar conta</span>
                </button>
              </div>

              {recuperando ? (
                <form onSubmit={handleRecuperar}>
                  <div className="bz-field">
                    <label htmlFor="email-recuperacao">E-mail da conta</label>
                    <input
                      className="bz-input"
                      id="email-recuperacao"
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="voce@exemplo.com"
                      autoComplete="email"
                      required
                    />
                  </div>

                  {linkEnviado && (
                    <div className="bz-feedback bz-feedback--success" role="status">
                      <MailCheck size={17} strokeWidth={1.75} aria-hidden="true" />
                      <p>Se o e-mail estiver cadastrado, o link de redefinição chega em instantes. Confira também a pasta de spam.</p>
                    </div>
                  )}

                  {erro && (
                    <div className="bz-feedback bz-feedback--danger" role="alert">
                      <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" />
                      <p>{erro}</p>
                    </div>
                  )}

                  <Button className="auth-submit" type="submit" variant="primary" size="lg" disabled={loading || linkEnviado}>
                    {loading ? 'Aguarde…' : linkEnviado ? 'Link enviado' : 'Enviar link de redefinição'}
                  </Button>
                  <button className="auth-link" type="button" onClick={() => { setRecuperando(false); setErro(''); setLinkEnviado(false) }}>
                    Voltar para entrar
                  </button>
                </form>
              ) : (
              <form onSubmit={handleSubmit}>
                  {isCadastro && (
                    <div className="bz-field">
                      <label htmlFor="nome">Nome completo</label>
                      <input
                        className="bz-input"
                        id="nome"
                        type="text"
                        value={nome}
                        onChange={event => setNome(event.target.value)}
                        placeholder="Seu nome"
                        autoComplete="name"
                        required
                      />
                    </div>
                  )}

                  <div className="bz-field">
                    <label htmlFor="email">E-mail</label>
                    <input
                      className="bz-input"
                      id="email"
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="voce@exemplo.com"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div className="bz-field">
                    <label htmlFor="senha">Senha</label>
                    <input
                      className="bz-input"
                      id="senha"
                      type="password"
                      value={senha}
                      onChange={event => setSenha(event.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      autoComplete={isCadastro ? 'new-password' : 'current-password'}
                      minLength={6}
                      required
                    />
                  </div>

                  {!isCadastro && (
                    <button className="auth-link auth-link--inline" type="button" onClick={() => { setRecuperando(true); setErro('') }}>
                      Esqueci minha senha
                    </button>
                  )}

                  {erro && (
                    <div className="bz-feedback bz-feedback--danger" role="alert">
                      <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" />
                      <p>{erro}</p>
                    </div>
                  )}

                  <Button className="auth-submit" type="submit" variant="primary" size="lg" disabled={loading || authLoading}>
                    {loading ? 'Aguarde…' : isCadastro ? 'Criar conta gratuita' : 'Entrar no painel'}
                  </Button>
                  {isCadastro && <p className="auth-policy">Veja como seus dados são utilizados na <Link to="/privacidade">política de privacidade</Link>.</p>}
                </form>
              )}
            </div>

            <div className="auth-trust" aria-label="Informações de segurança">
              <span><LockKeyhole size={14} strokeWidth={1.75} />Conexão protegida</span>
              <span><ShieldCheck size={14} strokeWidth={1.75} />Controle de acesso por conta</span>
            </div>
          </motion.div>
        </main>

        <aside className="auth-aside" aria-label="Como o DocLimpo funciona">
          <span className="bz-micro">O que acontece depois</span>
          <h2>Menos uma data para carregar na cabeça.</h2>
          <div className="auth-aside__list">
            {accessBenefits.map(({ icon: Icon, title, description }) => (
              <div className="auth-aside__item" key={title}>
                <span className="auth-aside__icon"><Icon size={20} strokeWidth={1.75} /></span>
                <div>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="auth-aside__signal">
            <span>JANELAS DE ALERTA</span>
            <strong>90 · 30 · 7 · 1</strong>
          </div>
        </aside>
      </div>
    </div>
  )
}
