import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../integrations/supabase/client'
import type { Tables } from '../integrations/supabase/types'

const ACCENT = '#4361ee'

const ICONS: Record<string, string> = {
  cnh: '🪪', crlv: '🚗', ipva: '📋', passaporte: '✈️',
  rg: '🪪', seguro: '🛡️', plano_saude: '🏥', carteira_trabalho: '💼', outro: '📄'
}

const LABELS: Record<string, string> = {
  cnh: 'CNH', crlv: 'CRLV', ipva: 'IPVA', passaporte: 'Passaporte',
  rg: 'RG', seguro: 'Seguro Auto', plano_saude: 'Plano de Saude',
  carteira_trabalho: 'Carteira de Trabalho', outro: 'Outro'
}

const GUIAS: Record<string, { passos: { titulo: string, desc: string, tempo: string, custo: string }[], multa: string }> = {
  cnh: {
    multa: 'R$ 293,47 + 5 pontos + risco de apreensao',
    passos: [
      { titulo: 'Agendar exame medico', desc: 'Procure uma clinica credenciada pelo DETRAN', tempo: '1-3 dias', custo: 'R$ 80-150' },
      { titulo: 'Realizar exame psicotecnico', desc: 'Agende na mesma clinica ou em outra credenciada', tempo: '1 dia', custo: 'R$ 60-100' },
      { titulo: 'Pagar taxa de renovacao', desc: 'Acesse o site do DETRAN do seu estado', tempo: '30 min', custo: 'R$ 80-120' },
      { titulo: 'Aguardar nova CNH', desc: 'A CNH chega pelos Correios em ate 30 dias uteis', tempo: '15-30 dias', custo: 'Gratis' },
    ]
  },
  crlv: {
    multa: 'R$ 293,47 + veiculo pode ser apreendido',
    passos: [
      { titulo: 'Quitar debitos do veiculo', desc: 'Verifique e pague multas, IPVA e DPVAT pendentes', tempo: '1 dia', custo: 'Variavel' },
      { titulo: 'Pagar IPVA do ano', desc: 'Acesse o site da Secretaria da Fazenda do seu estado', tempo: '30 min', custo: 'Variavel' },
      { titulo: 'Emitir CRLV digital', desc: 'Baixe pelo app do DETRAN ou site oficial', tempo: '10 min', custo: 'Gratis' },
    ]
  },
  passaporte: {
    multa: 'Viagem cancelada + prejuizo medio de R$ 5.000',
    passos: [
      { titulo: 'Agendar na Policia Federal', desc: 'Acesse o site da PF e escolha a unidade mais proxima', tempo: '1-30 dias', custo: 'Gratis' },
      { titulo: 'Reunir documentos', desc: 'RG, CPF, foto 3x4 recente e comprovante de residencia', tempo: '1 dia', custo: 'R$ 15-30' },
      { titulo: 'Pagar a GRU', desc: 'Taxa de R$ 257,25 para passaporte comum', tempo: '30 min', custo: 'R$ 257,25' },
      { titulo: 'Comparecer a PF', desc: 'Leve todos os documentos e tire as digitais', tempo: '2-3h', custo: 'Gratis' },
      { titulo: 'Retirar o passaporte', desc: 'Prazo de 6 dias uteis', tempo: '6 dias', custo: 'R$ 15,51' },
    ]
  },
  ipva: {
    multa: '0,33% ao dia + juros + divida ativa',
    passos: [
      { titulo: 'Verificar valor do IPVA', desc: 'Acesse o site da Secretaria da Fazenda do seu estado', tempo: '10 min', custo: 'Gratis' },
      { titulo: 'Escolher forma de pagamento', desc: 'Parcele em ate 5x ou pague a vista com desconto', tempo: '15 min', custo: 'Variavel' },
      { titulo: 'Pagar o boleto', desc: 'Pague no banco, app ou internet banking', tempo: '10 min', custo: 'IPVA + taxa' },
    ]
  },
  seguro: {
    multa: 'Sem cobertura em caso de sinistro',
    passos: [
      { titulo: 'Contatar sua seguradora', desc: 'Ligue ou acesse o app da seguradora para renovar', tempo: '30 min', custo: 'Variavel' },
      { titulo: 'Revisar cobertura', desc: 'Aproveite para ajustar coberturas e franquia', tempo: '1h', custo: 'Gratis' },
      { titulo: 'Assinar apolice', desc: 'Assine digitalmente e guarde o comprovante', tempo: '15 min', custo: 'Gratis' },
    ]
  },
}

const GUIA_PADRAO = {
  multa: 'Varia por tipo de documento',
  passos: [
    { titulo: 'Verifique a documentacao necessaria', desc: 'Consulte o orgao responsavel pelo documento', tempo: 'Variavel', custo: 'Variavel' },
    { titulo: 'Pague as taxas necessarias', desc: 'Verifique no site oficial os valores atualizados', tempo: 'Variavel', custo: 'Variavel' },
    { titulo: 'Realize a renovacao', desc: 'Presencialmente ou online conforme o documento', tempo: 'Variavel', custo: 'Variavel' },
  ]
}

function diasRestantes(data: string) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const venc = new Date(data + 'T00:00:00')
  return Math.round((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatus(dias: number) {
  if (dias < 0) return { label: 'Vencido', cor: '#ef4444' }
  if (dias <= 7) return { label: 'Urgente', cor: '#ef4444' }
  if (dias <= 30) return { label: 'Atencao', cor: '#f59e0b' }
  return { label: 'Em dia', cor: '#22c55e' }
}

export default function DocumentoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dark, setDark] = useState(false)
  const [doc, setDoc] = useState<Tables<'documentos'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [renovando, setRenovando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [novaData, setNovaData] = useState('')
  const [novoApelido, setNovoApelido] = useState('')

  const bg = dark ? '#09090f' : '#f8f9fc'
  const surface = dark ? '#0e0e18' : '#ffffff'
  const border = dark ? '#ffffff0f' : '#e2e8f0'
  const text = dark ? '#e8edf5' : '#0f172a'
  const muted = dark ? '#4a5568' : '#64748b'

  useEffect(() => {
    if (!id) return
    let cancelado = false
    const carregar = async () => {
      const { data } = await supabase.from('documentos').select('*').eq('id', id).single()
      if (cancelado) return
      setDoc(data)
      setLoading(false)
    }
    carregar()
    return () => { cancelado = true }
  }, [id])

  const marcarRenovado = async () => {
    if (!id) return
    setRenovando(true)
    await supabase.from('documentos').update({ resolvido: true }).eq('id', id)
    navigate('/dashboard')
  }

  const salvarEdicao = async () => {
    if (!id) return
    await supabase.from('documentos').update({
      data_vencimento: novaData || doc?.data_vencimento,
      apelido: novoApelido || doc?.apelido,
    }).eq('id', id)
    setEditando(false)
    const { data } = await supabase.from('documentos').select('*').eq('id', id).single()
    setDoc(data)
  }

  const excluir = async () => {
    if (!id) return
    if (confirm('Tem certeza que quer excluir este documento?')) {
      await supabase.from('documentos').delete().eq('id', id)
      navigate('/dashboard')
    }
  }

  if (!id) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: muted }}>Documento nao encontrado.</div>
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: muted }}>Carregando...</div>
  if (!doc) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: muted }}>Documento nao encontrado.</div>

  const dias = diasRestantes(doc.data_vencimento)
  const status = getStatus(dias)
  const guia = GUIAS[doc.tipo] || GUIA_PADRAO

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: bg, minHeight: '100vh', transition: 'background 0.3s' }}>

      {/* MODAL EDITAR */}
      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, width: '100%', maxWidth: 420, padding: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: text, marginBottom: 20 }}>Editar documento</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: text, marginBottom: 6 }}>Data de vencimento</label>
              <input
                type="date"
                defaultValue={doc?.data_vencimento}
                onChange={e => setNovaData(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 14, background: bg, color: text, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: text, marginBottom: 6 }}>Apelido</label>
              <input
                type="text"
                defaultValue={doc?.apelido || ''}
                onChange={e => setNovoApelido(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 14, background: bg, color: text, outline: 'none', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditando(false)} style={{ flex: 1, padding: 12, background: 'none', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: text, fontFamily: 'Inter, system-ui, sans-serif' }}>
                Cancelar
              </button>
              <button onClick={salvarEdicao} style={{ flex: 2, padding: 12, background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
                Salvar alteracoes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: muted, fontFamily: 'Inter, system-ui, sans-serif' }}>
            ← Voltar
          </button>
          <span style={{ fontSize: 18, fontWeight: 800, color: text }}>Doc<span style={{ color: ACCENT }}>Alert</span></span>
        </div>
        <button onClick={() => setDark(d => !d)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 15, color: muted }}>
          {dark ? '☀️' : '🌙'}
        </button>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>

          {/* COLUNA ESQUERDA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div style={{ background: surface, border: `1px solid ${border}`, borderLeft: `4px solid ${status.cor}`, borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ width: 48, height: 48, background: dark ? '#1a1a2e' : '#f1f5f9', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {ICONS[doc.tipo] || '📄'}
                </div>
                <div>
                  <h1 style={{ fontSize: 18, fontWeight: 800, color: text, margin: 0 }}>{doc.apelido || LABELS[doc.tipo]}</h1>
                  <p style={{ fontSize: 13, color: muted, margin: '2px 0 0' }}>{LABELS[doc.tipo]}</p>
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '20px 0', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, marginBottom: 18 }}>
                <div style={{ fontSize: 56, fontWeight: 900, color: status.cor, letterSpacing: '-2px', lineHeight: 1 }}>{Math.abs(dias)}</div>
                <div style={{ fontSize: 14, color: muted, marginTop: 4 }}>{dias < 0 ? 'dias atrasado' : 'dias restantes'}</div>
                <span style={{ display: 'inline-block', marginTop: 10, fontSize: 12, fontWeight: 700, color: status.cor, background: dark ? '#1a0a0a' : '#fef2f2', padding: '4px 12px', borderRadius: 100 }}>{status.label}</span>
              </div>

              <div style={{ fontSize: 13, color: muted, marginBottom: 16 }}>
                Vencimento: <strong style={{ color: text }}>{new Date(doc.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
              </div>

              <button onClick={marcarRenovado} disabled={renovando} style={{ width: '100%', padding: 12, background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', marginBottom: 10 }}>
                {renovando ? 'Marcando...' : '✓ Marcar como renovado'}
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditando(true)} style={{ flex: 1, padding: 10, background: 'none', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: text, fontFamily: 'Inter, system-ui, sans-serif' }}>
                  ✏️ Editar
                </button>
                <button onClick={excluir} style={{ flex: 1, padding: 10, background: 'none', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#ef4444', fontFamily: 'Inter, system-ui, sans-serif' }}>
                  🗑️ Excluir
                </button>
              </div>
            </div>

            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 22 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 4 }}>Custo do descuido</h3>
              <p style={{ fontSize: 13, color: muted, marginBottom: 12 }}>Se esse documento vencer sem renovacao:</p>
              <div style={{ background: dark ? '#1a0a0a' : '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ fontSize: 13, color: '#dc2626', margin: 0, lineHeight: 1.6 }}>⚠ {guia.multa}</p>
              </div>
            </div>

            <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 22 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 14 }}>Alertas configurados</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {['90 dias antes', '30 dias antes', '7 dias antes', 'No dia do vencimento'].map((alerta, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', background: dark ? '#0a0d14' : '#f8f9fc', borderRadius: 8, border: `1px solid ${border}` }}>
                    <span style={{ fontSize: 13, color: text }}>🔔 {alerta}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>Email ativo</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: text, marginBottom: 4 }}>Guia de renovacao</h2>
            <p style={{ fontSize: 13, color: muted, marginBottom: 24 }}>Passo a passo para renovar seu {LABELS[doc.tipo]}.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {guia.passos.map((passo, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: i < guia.passos.length - 1 ? 22 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: ACCENT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{i + 1}</div>
                    {i < guia.passos.length - 1 && <div style={{ width: 2, flex: 1, background: border, marginTop: 6 }} />}
                  </div>
                  <div style={{ paddingBottom: i < guia.passos.length - 1 ? 6 : 0 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: text, margin: '4px 0 6px' }}>{passo.titulo}</h4>
                    <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, margin: '0 0 8px' }}>{passo.desc}</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontSize: 11, color: muted, background: dark ? '#1a1a2e' : '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>⏱ {passo.tempo}</span>
                      <span style={{ fontSize: 11, color: muted, background: dark ? '#1a1a2e' : '#f1f5f9', padding: '2px 8px', borderRadius: 6 }}>💰 {passo.custo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}