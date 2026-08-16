import { useState } from 'react'
import { supabase } from '../../integrations/supabase/client'
import { useAuth } from '../../hooks/useAuth'
import { interpretarErro, textoDaFalha, type FalhaAoSalvar } from '../../lib/erros'

const ACCENT = '#4361ee'

const TIPOS = [
  { id: 'cnh', label: 'CNH', icon: '🪪' },
  { id: 'crlv', label: 'CRLV', icon: '🚗' },
  { id: 'ipva', label: 'IPVA', icon: '📋' },
  { id: 'passaporte', label: 'Passaporte', icon: '✈️' },
  { id: 'rg', label: 'RG', icon: '🪪' },
  { id: 'seguro', label: 'Seguro Auto', icon: '🛡️' },
  { id: 'plano_saude', label: 'Plano de Saude', icon: '🏥' },
  { id: 'carteira_trabalho', label: 'Carteira de Trabalho', icon: '💼' },
  { id: 'outro', label: 'Outro', icon: '📄' },
]

interface Props {
  dark: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddDocumentModal({ dark, onClose, onSuccess }: Props) {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState('')
  const [apelido, setApelido] = useState('')
  const [data, setData] = useState('')
  const [loading, setLoading] = useState(false)
  const [falha, setFalha] = useState<FalhaAoSalvar | null>(null)

  const surface = dark ? '#0e0e18' : '#ffffff'
  const bg = dark ? '#09090f' : '#f8f9fc'
  const border = dark ? '#ffffff0f' : '#e2e8f0'
  const text = dark ? '#e8edf5' : '#0f172a'
  const muted = dark ? '#4a5568' : '#64748b'

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

    setLoading(false)
    onSuccess()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

        {/* HEADER */}
        <div style={{ padding: '24px 28px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: text, margin: 0, letterSpacing: '-0.3px' }}>Adicionar documento</h2>
            <p style={{ fontSize: 13, color: muted, margin: '4px 0 0' }}>Passo {step} de 2</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: muted, lineHeight: 1 }}>✕</button>
        </div>

        {/* STEP 1 — TIPO */}
        {step === 1 && (
          <div style={{ padding: 28 }}>
            <p style={{ fontSize: 14, color: muted, marginBottom: 20 }}>Qual documento voce quer monitorar?</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
              {TIPOS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  style={{
                    background: tipo === t.id ? (dark ? '#1a2640' : '#eff3ff') : bg,
                    border: `1px solid ${tipo === t.id ? ACCENT : border}`,
                    borderRadius: 10,
                    padding: '14px 10px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{t.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: tipo === t.id ? ACCENT : text }}>{t.label}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => tipo && setStep(2)}
              disabled={!tipo}
              style={{ width: '100%', padding: 13, background: tipo ? ACCENT : (dark ? '#1a1a2e' : '#e2e8f0'), color: tipo ? '#fff' : muted, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: tipo ? 'pointer' : 'not-allowed', fontFamily: 'Inter, system-ui, sans-serif', transition: 'all 0.15s' }}
            >
              Continuar →
            </button>
          </div>
        )}

        {/* STEP 2 — DATA */}
        {step === 2 && (
          <div style={{ padding: 28 }}>
            <p style={{ fontSize: 14, color: muted, marginBottom: 24 }}>
              Documento selecionado: <strong style={{ color: text }}>{TIPOS.find(t => t.id === tipo)?.icon} {TIPOS.find(t => t.id === tipo)?.label}</strong>
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: text, marginBottom: 6 }}>Data de vencimento</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 14, background: bg, color: text, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: text, marginBottom: 6 }}>
                Apelido <span style={{ fontWeight: 400, color: muted }}>(opcional)</span>
              </label>
              <input
                type="text"
                value={apelido}
                onChange={e => setApelido(e.target.value)}
                placeholder='Ex: "CNH do Joao"'
                style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 14, background: bg, color: text, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
              />
            </div>

            {falha && (
              <div style={{ background: falha.tipo === 'limite_plano' ? (dark ? '#1a2640' : '#eff3ff') : '#fef2f2', border: `1px solid ${falha.tipo === 'limite_plano' ? (dark ? '#4361ee40' : '#c7d7fd') : '#fecaca'}`, borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: falha.tipo === 'limite_plano' ? (dark ? '#a5b4fc' : '#4338ca') : '#dc2626', margin: 0, lineHeight: 1.6 }}>
                  {textoDaFalha(falha)}
                </p>
                {falha.tipo === 'limite_plano' && (
                  <button
                    onClick={onClose}
                    style={{ marginTop: 10, padding: '8px 14px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    Fazer upgrade
                  </button>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(1)}
                style={{ flex: 1, padding: 13, background: 'none', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: text, fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                ← Voltar
              </button>
              <button
                onClick={handleSalvar}
                disabled={!data || loading}
                style={{ flex: 2, padding: 13, background: data && !loading ? ACCENT : (dark ? '#1a1a2e' : '#e2e8f0'), color: data && !loading ? '#fff' : muted, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: data && !loading ? 'pointer' : 'not-allowed', fontFamily: 'Inter, system-ui, sans-serif', transition: 'all 0.15s' }}
              >
                {loading ? 'Salvando...' : 'Salvar documento'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}