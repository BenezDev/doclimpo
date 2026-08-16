import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../integrations/supabase/client'
import { AddDocumentModal } from '../components/ui/AddDocumentModal'

const ACCENT = '#4361ee'

interface Documento {
  id: string
  tipo: string
  apelido: string | null
  data_vencimento: string
  resolvido: boolean
}

const ICONS: Record<string, string> = {
  cnh: '🪪', crlv: '🚗', ipva: '📋', passaporte: '✈️',
  rg: '🪪', seguro: '🛡️', plano_saude: '🏥', carteira_trabalho: '💼', outro: '📄'
}

const LABELS: Record<string, string> = {
  cnh: 'CNH', crlv: 'CRLV', ipva: 'IPVA', passaporte: 'Passaporte',
  rg: 'RG', seguro: 'Seguro Auto', plano_saude: 'Plano de Saude',
  carteira_trabalho: 'Carteira de Trabalho', outro: 'Outro'
}

function parseData(data: string) {
  const partes = data.split('-')
  return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]))
}

function diasRestantes(data: string) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const venc = parseData(data)
  return Math.round((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

function formatarData(data: string) {
  const partes = data.split('-')
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

function getStatus(dias: number) {
  if (dias < 0) return { label: 'Vencido', cor: '#ef4444', bg: '#fef2f2', bgDark: '#1a0a0a' }
  if (dias <= 7) return { label: 'Urgente', cor: '#ef4444', bg: '#fef2f2', bgDark: '#1a0a0a' }
  if (dias <= 30) return { label: 'Atencao', cor: '#f59e0b', bg: '#fffbeb', bgDark: '#1a1500' }
  return { label: 'Em dia', cor: '#22c55e', bg: '#f0fdf4', bgDark: '#0a1a0a' }
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [dark, setDark] = useState(false)
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [versao, setVersao] = useState(0)

  const bg = dark ? '#09090f' : '#f8f9fc'
  const surface = dark ? '#0e0e18' : '#ffffff'
  const border = dark ? '#ffffff0f' : '#e2e8f0'
  const text = dark ? '#e8edf5' : '#0f172a'
  const muted = dark ? '#4a5568' : '#64748b'
  const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'usuario'
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  // O filtro por usuario_id é redundante com o RLS, mas evita depender de
  // uma única camada: se alguma política afrouxar, a query continua correta.
  useEffect(() => {
    if (!user) return
    let cancelado = false
    const carregar = async () => {
      const { data } = await supabase
        .from('documentos')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('resolvido', false)
        .order('data_vencimento', { ascending: true })
      if (cancelado) return
      setDocs(data || [])
      setLoading(false)
    }
    carregar()
    return () => { cancelado = true }
  }, [user, versao])

  const recarregarDocs = () => setVersao(v => v + 1)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const marcarRenovado = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase.from('documentos').update({ resolvido: true }).eq('id', id)
    recarregarDocs()
  }

  const emDia = docs.filter(d => diasRestantes(d.data_vencimento) > 30).length
  const atencao = docs.filter(d => { const di = diasRestantes(d.data_vencimento); return di > 7 && di <= 30 }).length
  const urgente = docs.filter(d => diasRestantes(d.data_vencimento) <= 7).length

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: bg, minHeight: '100vh', transition: 'background 0.3s' }}>

      {modal && <AddDocumentModal dark={dark} onClose={() => setModal(false)} onSuccess={() => { setModal(false); recarregarDocs() }} />}

      <nav style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: text }}>
          Doc<span style={{ color: ACCENT }}>Alert</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setDark(d => !d)} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 15, color: muted }}>
            {dark ? '☀️' : '🌙'}
          </button>
          <button onClick={handleSignOut} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, color: muted, fontWeight: 500, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Sair
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 16px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: text, letterSpacing: '-0.5px', marginBottom: 4 }}>
              {saudacao}, {nome} 👋
            </h1>
            <p style={{ fontSize: 14, color: muted }}>Seus documentos monitorados.</p>
          </div>
          <button onClick={() => setModal(true)} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', whiteSpace: 'nowrap' }}>
            + Adicionar
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Em dia', valor: emDia, cor: '#22c55e' },
            { label: 'Atencao', valor: atencao, cor: '#f59e0b' },
            { label: 'Urgente', valor: urgente, cor: '#ef4444' },
          ].map(stat => (
            <div key={stat.label} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 12, padding: '16px' }}>
              <p style={{ fontSize: 12, color: muted, marginBottom: 6, fontWeight: 500 }}>{stat.label}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: stat.cor, margin: 0, letterSpacing: '-1px' }}>{stat.valor}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: muted }}>Carregando...</div>
        ) : docs.length === 0 ? (
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: text, marginBottom: 8 }}>Nenhum documento ainda</h3>
            <p style={{ fontSize: 13, color: muted, marginBottom: 24, lineHeight: 1.65 }}>
              Adicione seu primeiro documento e nunca mais pague multa por descuido.
            </p>
            <button onClick={() => setModal(true)} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
              + Adicionar documento
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {docs.map(doc => {
              const dias = diasRestantes(doc.data_vencimento)
              const status = getStatus(dias)
              return (
                <div
                  key={doc.id}
                  onClick={() => navigate(`/documento/${doc.id}`)}
                  style={{ background: surface, border: `1px solid ${border}`, borderLeft: `3px solid ${status.cor}`, borderRadius: 12, padding: '16px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 40, height: 40, background: dark ? '#1a1a2e' : '#f1f5f9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {ICONS[doc.tipo] || '📄'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.apelido || LABELS[doc.tipo] || doc.tipo}
                        </div>
                        <div style={{ fontSize: 12, color: muted, marginBottom: 6 }}>
                          Vence em {formatarData(doc.data_vencimento)}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: status.cor, background: dark ? status.bgDark : status.bg, padding: '2px 8px', borderRadius: 100 }}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: status.cor, letterSpacing: '-0.5px' }}>
                          {Math.abs(dias)}d
                        </div>
                        <div style={{ fontSize: 11, color: muted }}>{dias < 0 ? 'atrasado' : 'restantes'}</div>
                      </div>
                      <button
                        onClick={(e) => marcarRenovado(doc.id, e)}
                        style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: muted, fontFamily: 'Inter, system-ui, sans-serif', whiteSpace: 'nowrap' }}
                      >
                        ✓ Renovado
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}