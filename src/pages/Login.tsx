import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'

export default function Login() {
  const navigate = useNavigate()
  const [dark, setDark] = useState(false)
  const [isCadastro, setIsCadastro] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const bg = dark ? '#09090f' : '#ffffff'
  const bg2 = dark ? '#0e0e18' : '#f8f9fc'
  const border = dark ? '#ffffff0f' : '#e2e8f0'
  const text = dark ? '#e8edf5' : '#0f172a'
  const muted = dark ? '#4a5568' : '#64748b'
  const card = dark ? '#0e0e18' : '#ffffff'
  const ACCENT = '#4361ee'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErro('')

    if (isCadastro) {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } }
      })
      if (error) {
  setErro(error.message)
} else {
  setTimeout(() => navigate('/onboarding'), 500)
}
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) setErro('Email ou senha incorretos.')
    }

    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: 'background 0.3s' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 48px', borderBottom: `1px solid ${border}` }}>
        <span onClick={() => navigate('/')} style={{ fontSize: 18, fontWeight: 800, cursor: 'pointer' }}>
          Doc<span style={{ color: ACCENT }}>Alert</span>
        </span>
        <button onClick={() => setDark(d => !d)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 12px', cursor: 'pointer', color: muted, fontSize: 16 }}>
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>

      {/* CONTEUDO */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* CARD */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: '40px 36px', boxShadow: dark ? 'none' : '0 4px 24px rgba(0,0,0,0.06)' }}>

            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', color: text, marginBottom: 6 }}>
                {isCadastro ? 'Criar sua conta' : 'Bem-vindo de volta'}
              </h1>
              <p style={{ fontSize: 14, color: muted }}>
                {isCadastro ? 'Gratis para sempre no plano basico. Sem cartao.' : 'Entre na sua conta para continuar.'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {isCadastro && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: text, marginBottom: 6 }}>Nome completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Seu nome"
                    required
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 14, background: bg, color: text, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: text, marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 14, background: bg, color: text, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: text, marginBottom: 6 }}>Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Minimo 6 caracteres"
                  required
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 14, background: bg, color: text, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>

              {erro && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{erro}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '13px', background: loading ? '#6b7280' : ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s', fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {loading ? 'Aguarde...' : isCadastro ? 'Criar conta gratis' : 'Entrar'}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: muted }}>
              {isCadastro ? 'Ja tem conta?' : 'Nao tem conta?'}{' '}
              <span onClick={() => { setIsCadastro(!isCadastro); setErro('') }} style={{ color: ACCENT, fontWeight: 700, cursor: 'pointer' }}>
                {isCadastro ? 'Entrar' : 'Criar gratis'}
              </span>
            </p>
          </div>

          {/* TRUST */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 24, flexWrap: 'wrap' }}>
            {['🔒 SSL', '🇧🇷 LGPD', '🔐 Sem spam'].map(t => (
              <span key={t} style={{ fontSize: 13, color: muted }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* SIDE PANEL INFO (desktop) */}
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 380, background: bg2, borderLeft: `1px solid ${border}`, padding: '80px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 10 }}>Por que usar o DocAlert?</p>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: text, letterSpacing: '-0.5px', lineHeight: 1.2, marginBottom: 24 }}>Proteja seus documentos antes que seja tarde</h2>
        </div>
        {[
          { icon: '📄', title: 'CNH, CRLV, Passaporte e mais', desc: '11 tipos de documentos monitorados' },
          { icon: '🔔', title: 'Alertas 90, 30 e 7 dias antes', desc: 'Por email e WhatsApp' },
          { icon: '💸', title: 'Evite multas de ate R$ 5.000', desc: 'Calcule o custo antes de esquecer' },
          { icon: '🔒', title: 'Seus dados protegidos', desc: 'Criptografia SSL + conformidade LGPD' },
        ].map(item => (
          <div key={item.title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: text, marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: muted }}>{item.desc}</div>
            </div>
          </div>
        ))}
        <div style={{ marginTop: 8, padding: '16px 20px', background: dark ? '#4361ee10' : '#eff3ff', border: `1px solid ${dark ? '#4361ee30' : '#c7d7fd'}`, borderRadius: 10 }}>
          <p style={{ fontSize: 13, color: dark ? '#a5b4fc' : '#4338ca', margin: 0, lineHeight: 1.6 }}>
            "Quase perdi minha viagem por passaporte vencido. O DocAlert me salvou." — Mariana S., SP
          </p>
        </div>
      </div>

    </div>
  )
}