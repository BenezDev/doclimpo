 import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../integrations/supabase/client'
import { interpretarErro, textoDaFalha, type FalhaAoSalvar } from '../lib/erros'

const ACCENT = '#4361ee'

const TIPOS = [
  { id: 'cnh', label: 'CNH', icon: '🪪', desc: 'Carteira de Motorista' },
  { id: 'crlv', label: 'CRLV', icon: '🚗', desc: 'Documento do Veiculo' },
  { id: 'ipva', label: 'IPVA', icon: '📋', desc: 'Imposto do Veiculo' },
  { id: 'passaporte', label: 'Passaporte', icon: '✈️', desc: 'Documento de Viagem' },
  { id: 'rg', label: 'RG', icon: '🪪', desc: 'Identidade' },
  { id: 'seguro', label: 'Seguro Auto', icon: '🛡️', desc: 'Seguro do Veiculo' },
  { id: 'plano_saude', label: 'Plano de Saude', icon: '🏥', desc: 'Plano Medico' },
  { id: 'carteira_trabalho', label: 'Carteira de Trabalho', icon: '💼', desc: 'CTPS' },
  { id: 'outro', label: 'Outro', icon: '📄', desc: 'Outro documento' },
]

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState('')
  const [apelido, setApelido] = useState('')
  const [data, setData] = useState('')
  const [loading, setLoading] = useState(false)
  const [falha, setFalha] = useState<FalhaAoSalvar | null>(null)

  const nome = user?.user_metadata?.nome || 'usuario'

  const handleSalvar = async () => {
    if (!tipo || !data || !user) return
    setLoading(true)
    setFalha(null)

    const { error } = await supabase.from('documentos').insert({
      usuario_id: user.id,
      tipo,
      apelido: apelido || null,
      data_vencimento: data,
    })

    if (error) {
      setFalha(interpretarErro(error))
      setLoading(false)
      return
    }

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('user_id', user.id)

    setLoading(false)
    setStep(3)
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#f8f9fc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>Doc<span style={{ color: ACCENT }}>Alert</span></span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ width: 28, height: 4, borderRadius: 100, background: n <= step ? ACCENT : '#e2e8f0', transition: 'background 0.3s' }} />
          ))}
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 12 }}>Passo 1 de 2</p>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', marginBottom: 8, lineHeight: 1.1 }}>
                Ola, {nome}! 👋<br />Qual documento quer monitorar primeiro?
              </h1>
              <p style={{ fontSize: 15, color: '#64748b', marginBottom: 32 }}>Escolha um para comecar. Voce pode adicionar mais depois.</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
                {TIPOS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTipo(t.id)}
                    style={{
                      background: tipo === t.id ? '#eff3ff' : '#fff',
                      border: `1px solid ${tipo === t.id ? ACCENT : '#e2e8f0'}`,
                      borderRadius: 12,
                      padding: '18px 12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: tipo === t.id ? ACCENT : '#0f172a', marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.desc}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => tipo && setStep(2)}
                disabled={!tipo}
                style={{ width: '100%', padding: 14, background: tipo ? ACCENT : '#e2e8f0', color: tipo ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: tipo ? 'pointer' : 'not-allowed', fontFamily: 'Inter, system-ui, sans-serif', transition: 'all 0.15s' }}
              >
                Continuar →
              </button>

              <button onClick={() => navigate('/dashboard')} style={{ width: '100%', marginTop: 12, padding: 12, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8', fontFamily: 'Inter, system-ui, sans-serif' }}>
                Pular por agora (nao recomendado)
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 12 }}>Passo 2 de 2</p>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', marginBottom: 8 }}>
                Quando vence seu {TIPOS.find(t => t.id === tipo)?.label}?
              </h1>
              <p style={{ fontSize: 15, color: '#64748b', marginBottom: 32 }}>Vamos te avisar antes para voce nunca ser pego de surpresa.</p>

              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>Data de vencimento</label>
                  <input
                    type="date"
                    value={data}
                    onChange={e => setData(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, background: '#f8f9fc', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
                    Apelido <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={apelido}
                    onChange={e => setApelido(e.target.value)}
                    placeholder={`Ex: "${TIPOS.find(t => t.id === tipo)?.label} do ${nome}"`}
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 15, background: '#f8f9fc', color: '#0f172a', outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
                  />
                </div>
              </div>

              {data && (
                <div style={{ background: '#eff3ff', border: '1px solid #c7d7fd', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 18 }}>🔔</span>
                  <div style={{ fontSize: 13, color: '#4338ca', lineHeight: 1.6 }}>
                    Voce vai receber alertas <strong>90 dias, 30 dias e 7 dias antes</strong> do vencimento por email.
                  </div>
                </div>
              )}

              {falha && (
                <div style={{ background: falha.tipo === 'limite_plano' ? '#eff3ff' : '#fef2f2', border: `1px solid ${falha.tipo === 'limite_plano' ? '#c7d7fd' : '#fecaca'}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
                  <p style={{ fontSize: 13, color: falha.tipo === 'limite_plano' ? '#4338ca' : '#dc2626', margin: 0, lineHeight: 1.6 }}>
                    {textoDaFalha(falha)}
                  </p>
                  {falha.tipo === 'limite_plano' && (
                    <button
                      onClick={() => navigate('/dashboard')}
                      style={{ marginTop: 12, padding: '9px 16px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      Ver meus documentos →
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep(1)} style={{ flex: 1, padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748b', fontFamily: 'Inter, system-ui, sans-serif' }}>
                  ← Voltar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={!data || loading}
                  style={{ flex: 2, padding: 14, background: data && !loading ? ACCENT : '#e2e8f0', color: data && !loading ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: data && !loading ? 'pointer' : 'not-allowed', fontFamily: 'Inter, system-ui, sans-serif', transition: 'all 0.15s' }}
                >
                  {loading ? 'Salvando...' : 'Proteger meu documento →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — SUCESSO */}
          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', marginBottom: 12 }}>
                Documento protegido!
              </h1>
              <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.65, marginBottom: 12 }}>
                Seu {TIPOS.find(t => t.id === tipo)?.label} esta sendo monitorado. Vamos te avisar antes de vencer.
              </p>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', marginBottom: 32, display: 'inline-block' }}>
                <span style={{ fontSize: 14, color: '#15803d', fontWeight: 600 }}>
                  ✓ Alertas configurados: 90 dias · 30 dias · 7 dias antes
                </span>
              </div>
              <br />
              <button
                onClick={() => navigate('/dashboard')}
                style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Ver meu painel →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}