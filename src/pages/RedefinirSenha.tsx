import { motion, useReducedMotion } from 'framer-motion'
import { CircleAlert, KeyRound, LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand, Button, ThemeToggle } from '../components/ui/Bezel'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../integrations/supabase/client'
import { validateNewPassword } from '../lib/access-flow'
import { fadeUp } from '../lib/motion'

// O link do e-mail de recuperação traz a sessão no fragmento da URL; o client
// do Supabase a detecta e o AuthProvider expõe `user`. Sem sessão, o link é
// inválido ou expirou — e nunca aceitamos senha nova sem ela.
export default function RedefinirSenha() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const reduceMotion = useReducedMotion()
  const { dark, toggleTheme } = useTheme()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const invalido = validateNewPassword(senha, confirmacao)
    if (invalido) { setErro(invalido); return }
    setSalvando(true)
    setErro('')
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvando(false)
    if (error) { setErro('Não foi possível salvar a nova senha. Peça um novo link e tente de novo.'); return }
    navigate('/dashboard', { replace: true })
  }

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

      <div className="auth-layout auth-layout--single">
        <main className="auth-main">
          <motion.div className="auth-main__inner" {...(reduceMotion ? {} : fadeUp)}>
            <div className="auth-intro">
              <span className="bz-micro">Acesso seguro</span>
              <h1>Defina uma nova senha.</h1>
              <p>Ela substitui a anterior em todos os seus dispositivos.</p>
            </div>

            <div className="auth-panel">
              {authLoading ? (
                <p className="bz-field__help">Verificando o link de recuperação…</p>
              ) : !user ? (
                <>
                  <div className="bz-feedback bz-feedback--danger" role="alert">
                    <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" />
                    <p>Este link de recuperação é inválido ou já expirou. Peça um novo na tela de entrada.</p>
                  </div>
                  <Button className="auth-submit" variant="primary" size="lg" onClick={() => navigate('/login')} icon={<KeyRound size={17} strokeWidth={1.75} />}>
                    Pedir novo link
                  </Button>
                </>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="bz-field">
                    <label htmlFor="nova-senha">Nova senha</label>
                    <input
                      className="bz-input"
                      id="nova-senha"
                      type="password"
                      value={senha}
                      onChange={event => setSenha(event.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="bz-field">
                    <label htmlFor="confirmar-senha">Confirmar nova senha</label>
                    <input
                      className="bz-input"
                      id="confirmar-senha"
                      type="password"
                      value={confirmacao}
                      onChange={event => setConfirmacao(event.target.value)}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>

                  {erro && (
                    <div className="bz-feedback bz-feedback--danger" role="alert">
                      <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" />
                      <p>{erro}</p>
                    </div>
                  )}

                  <Button className="auth-submit" type="submit" variant="primary" size="lg" disabled={salvando}>
                    {salvando ? 'Salvando…' : 'Salvar nova senha'}
                  </Button>
                </form>
              )}
            </div>

            <div className="auth-trust" aria-label="Informações de segurança">
              <span><LockKeyhole size={14} strokeWidth={1.75} />Conexão protegida</span>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  )
}
