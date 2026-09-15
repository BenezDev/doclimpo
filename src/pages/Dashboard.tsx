import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FilePlus2,
  LogOut,
  Plus,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AddDocumentModal } from '../components/ui/AddDocumentModal'
import { EnderecoModal } from '../components/ui/EnderecoModal'
import { PlanosModal } from '../components/ui/PlanosModal'
import {
  Brand,
  Button,
  DocumentGlyph,
  type DocumentStatus,
  StatusPill,
  ThemeToggle,
} from '../components/ui/Bezel'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../integrations/supabase/client'
import { precisaPedirEndereco, type PerfilEndereco } from '../lib/endereco'
import { normalizarPlano, podeAdicionarDocumento, rotuloPlano, type PlanType } from '../lib/planos'
import { bezelSpring, stagger } from '../lib/motion'

interface Documento {
  id: string
  tipo: string
  apelido: string | null
  data_vencimento: string
  resolvido: boolean
}

type Filter = 'todos' | 'atencao' | 'criticos'

const LABELS: Record<string, string> = {
  cnh: 'CNH',
  crlv: 'CRLV',
  ipva: 'IPVA',
  passaporte: 'Passaporte',
  rg: 'RG',
  seguro: 'Seguro auto',
  plano_saude: 'Plano de saúde',
  carteira_trabalho: 'Carteira de trabalho',
  alvara: 'Alvará',
  certidao: 'Certidão negativa',
  das_mei: 'DAS-MEI',
  outro: 'Outro',
}

function parseData(data: string) {
  const [ano, mes, dia] = data.split('-')
  return new Date(Number(ano), Number(mes) - 1, Number(dia))
}

function diasRestantes(data: string) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((parseData(data).getTime() - hoje.getTime()) / 86_400_000)
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}

function getStatus(dias: number): { id: DocumentStatus; label: string } {
  if (dias < 0) return { id: 'vencido', label: 'Vencido' }
  if (dias <= 7) return { id: 'critico', label: 'Crítico' }
  if (dias <= 90) return { id: 'atencao', label: 'Atenção' }
  return { id: 'vigente', label: 'Vigente' }
}

function progressFor(dias: number) {
  if (dias > 90) return 4
  if (dias < 0) return 100
  return Math.max(8, Math.round(((90 - dias) / 90) * 100))
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const reduceMotion = useReducedMotion()
  const navigate = useNavigate()
  const { search } = useLocation()
  const [docs, setDocs] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [modal, setModal] = useState(false)
  const [version, setVersion] = useState(0)
  const [filter, setFilter] = useState<Filter>('todos')
  const [perfilEndereco, setPerfilEndereco] = useState<PerfilEndereco | null>(null)
  const [mostrarEndereco, setMostrarEndereco] = useState(false)
  const [plano, setPlano] = useState<PlanType>('FREE')
  const [planoVersao, setPlanoVersao] = useState(0)
  const [mostrarPlanos, setMostrarPlanos] = useState(false)
  const [avisoCheckout, setAvisoCheckout] = useState<{ tipo: 'sucesso' | 'neutro'; texto: string } | null>(null)
  const [enderecoAdiado, setEnderecoAdiado] = useState(() => {
    try { return localStorage.getItem('doclimpo-endereco-adiado') === '1' } catch { return false }
  })

  const nome = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'usuário'
  const initial = nome.slice(0, 1).toUpperCase()
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const carregar = async () => {
      setLoading(true)
      setLoadError(false)
      const { data, error } = await supabase
        .from('documentos')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('resolvido', false)
        .order('data_vencimento', { ascending: true })

      if (cancelled) return
      setDocs(data || [])
      setLoadError(Boolean(error))
      setLoading(false)
    }

    carregar()
    return () => { cancelled = true }
  }, [user, version])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('cep, logradouro, numero, complemento, bairro, cidade, uf, ibge, latitude, longitude')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setPerfilEndereco(data) })
    return () => { cancelled = true }
  }, [user])

  // Plano efetivo: a mesma função SQL que a trigger de limite usa (inclui o
  // plano herdado da família). Se o banco ainda não tiver a função, cai no
  // plan_type do perfil — nunca em "pago".
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const carregarPlano = async () => {
      const { data, error } = await supabase.rpc('meu_plano')
      if (cancelled) return
      if (!error && typeof data === 'string') { setPlano(normalizarPlano(data)); return }
      const { data: perfil } = await supabase.from('profiles').select('plan_type').eq('user_id', user.id).maybeSingle()
      if (!cancelled) setPlano(normalizarPlano(perfil?.plan_type))
    }
    carregarPlano()
    return () => { cancelled = true }
  }, [user, planoVersao])

  // Volta do Checkout do Stripe: sincroniza o plano na hora (o webhook é a
  // fonte contínua; isto cobre a janela até o evento chegar) e limpa a URL.
  useEffect(() => {
    const resultado = new URLSearchParams(search).get('checkout')
    if (!resultado) return
    let cancelled = false
    const concluir = async () => {
      if (resultado === 'success') {
        await supabase.functions.invoke('check-subscription', { body: {} }).catch(() => null)
        if (cancelled) return
        setPlanoVersao(value => value + 1)
        setAvisoCheckout({ tipo: 'sucesso', texto: 'Assinatura ativa. Seus documentos agora são ilimitados.' })
      } else if (resultado === 'canceled') {
        setAvisoCheckout({ tipo: 'neutro', texto: 'Pagamento não concluído. Seu plano continua o mesmo.' })
      }
      navigate('/dashboard', { replace: true })
    }
    concluir()
    return () => { cancelled = true }
  }, [search, navigate])

  const documentsWithDays = useMemo(() => docs.map(document => ({
    ...document,
    days: diasRestantes(document.data_vencimento),
  })), [docs])

  const filteredDocuments = documentsWithDays.filter(document => {
    if (filter === 'criticos') return document.days <= 7
    if (filter === 'atencao') return document.days > 7 && document.days <= 90
    return true
  })

  const current = documentsWithDays.filter(document => document.days > 90).length
  const attention = documentsWithDays.filter(document => document.days > 7 && document.days <= 90).length
  const critical = documentsWithDays.filter(document => document.days <= 7).length
  const nextDocument = documentsWithDays[0]

  const reloadDocuments = () => setVersion(value => value + 1)

  // Gate do plano: no limite, abre a assinatura em vez do formulário. O banco
  // impõe o mesmo limite (trigger enforce_plan_limits) caso o gate seja burlado.
  const abrirAdicionar = () => {
    if (podeAdicionarDocumento(plano, docs.length)) setModal(true)
    else setMostrarPlanos(true)
  }

  const abrirPlanosPorLimite = () => {
    setModal(false)
    setMostrarPlanos(true)
  }

  const adiarEndereco = () => {
    try { localStorage.setItem('doclimpo-endereco-adiado', '1') } catch { /* segue sem persistir */ }
    setEnderecoAdiado(true)
    setMostrarEndereco(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const markRenewed = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    await supabase.from('documentos').update({ resolvido: true }).eq('id', id)
    reloadDocuments()
  }

  const openDocument = (id: string) => navigate(`/documento/${id}`)

  return (
    <div className="bz-page dashboard-page">
      {mostrarPlanos && (
        <PlanosModal motivo={podeAdicionarDocumento(plano, docs.length) ? 'escolha' : 'limite'} planoAtual={plano} onClose={() => setMostrarPlanos(false)} />
      )}

      {modal && (
        <AddDocumentModal
          dark={dark}
          onClose={() => setModal(false)}
          onLimite={abrirPlanosPorLimite}
          mostrarEmpresariais={plano === 'MEI'}
          onSuccess={() => {
            setModal(false)
            const primeiro = docs.length === 0
            reloadDocuments()
            if (primeiro && precisaPedirEndereco(perfilEndereco, enderecoAdiado)) setMostrarEndereco(true)
          }}
        />
      )}

      {mostrarEndereco && (
        <EnderecoModal
          inicial={perfilEndereco}
          onClose={adiarEndereco}
          onSaved={(endereco) => { setPerfilEndereco(endereco); setMostrarEndereco(false) }}
        />
      )}

      <header className="bz-topbar dashboard-topbar">
        <div className="bz-container--wide bz-topbar__inner">
          <Brand />
          <div className="dashboard-account">
            <div className="dashboard-account__identity">
              <span className="dashboard-account__avatar" aria-hidden="true">{initial}</span>
              <div>
                <strong>{nome}</strong>
                <span>{user?.email}</span>
              </div>
            </div>
            <button className="bz-icon-button" type="button" onClick={() => navigate('/conta')} aria-label="Minha conta" title="Minha conta">
              <UserRound size={18} strokeWidth={1.75} />
            </button>
            <ThemeToggle dark={dark} onToggle={toggleTheme} />
            <button className="bz-icon-button" type="button" onClick={handleSignOut} aria-label="Sair da conta" title="Sair">
              <LogOut size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <main className="bz-container--wide dashboard-main">
        <section className="dashboard-heading">
          <div>
            <span className="bz-micro">Painel pessoal · {rotuloPlano(plano)}</span>
            <h1>{saudacao}, {nome}.</h1>
            <p>Veja o que precisa de atenção antes que vire urgência.</p>
          </div>
          <Button variant="primary" size="lg" onClick={abrirAdicionar} icon={<Plus size={18} strokeWidth={1.75} />}>
            Adicionar documento
          </Button>
        </section>

        {avisoCheckout && (
          <div className={`bz-feedback ${avisoCheckout.tipo === 'sucesso' ? 'bz-feedback--success' : 'bz-feedback--info'}`} role="status">
            <CheckCircle2 size={17} strokeWidth={1.75} aria-hidden="true" />
            <p>{avisoCheckout.texto}</p>
          </div>
        )}

        <section className="dashboard-summary" aria-label="Resumo dos documentos">
          <div className="dashboard-summary__primary">
            <span className="bz-micro">Próximo prazo</span>
            {nextDocument ? (
              <>
                <strong className="bz-data">{Math.abs(nextDocument.days).toString().padStart(2, '0')}</strong>
                <span>{nextDocument.days < 0 ? 'dias em atraso' : 'dias restantes'} · {nextDocument.apelido || LABELS[nextDocument.tipo]}</span>
              </>
            ) : (
              <>
                <strong className="bz-data">—</strong>
                <span>Nenhum prazo cadastrado</span>
              </>
            )}
          </div>
          <div className="dashboard-summary__metric">
            <span>Monitorados</span>
            <strong className="bz-data">{docs.length.toString().padStart(2, '0')}</strong>
          </div>
          <div className="dashboard-summary__metric">
            <span>Vigentes</span>
            <strong className="bz-data">{current.toString().padStart(2, '0')}</strong>
          </div>
          <div className="dashboard-summary__metric dashboard-summary__metric--warn">
            <span>Atenção</span>
            <strong className="bz-data">{attention.toString().padStart(2, '0')}</strong>
          </div>
          <div className="dashboard-summary__metric dashboard-summary__metric--danger">
            <span>Críticos</span>
            <strong className="bz-data">{critical.toString().padStart(2, '0')}</strong>
          </div>
        </section>

        <section className="documents-section">
          <div className="documents-toolbar">
            <div>
              <h2>Seus documentos</h2>
              <p>{docs.length} {docs.length === 1 ? 'prazo ativo' : 'prazos ativos'}</p>
            </div>
            <div className="documents-filter" aria-label="Filtrar documentos">
              {([
                ['todos', 'Todos'],
                ['atencao', 'Atenção'],
                ['criticos', 'Críticos'],
              ] as const).map(([id, label]) => (
                <button type="button" key={id} onClick={() => setFilter(id)} aria-pressed={filter === id}>
                  {filter === id && <motion.span className="documents-filter__active" layoutId="document-filter" transition={bezelSpring} />}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="documents-loading" aria-label="Carregando documentos">
              {[1, 2, 3].map(item => <span key={item} />)}
            </div>
          ) : loadError ? (
            <div className="documents-empty">
              <span className="documents-empty__icon"><CircleAlert size={24} strokeWidth={1.75} /></span>
              <h3>Não foi possível carregar os documentos</h3>
              <p>A conexão falhou antes de receber a lista. Tente novamente em instantes.</p>
              <Button variant="secondary" onClick={reloadDocuments}>Tentar novamente</Button>
            </div>
          ) : docs.length === 0 ? (
            <div className="documents-empty">
              <span className="documents-empty__icon"><FilePlus2 size={28} strokeWidth={1.75} /></span>
              <h3>Nenhum documento ainda</h3>
              <p>Cadastre o primeiro prazo para o painel começar a trabalhar.</p>
              <Button variant="primary" onClick={abrirAdicionar} icon={<Plus size={17} strokeWidth={1.75} />}>Cadastrar primeiro documento</Button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="documents-empty documents-empty--compact">
              <span className="documents-empty__icon"><CheckCircle2 size={24} strokeWidth={1.75} /></span>
              <h3>Nada nessa faixa</h3>
              <p>Seus documentos não têm prazos com esse nível de atenção.</p>
              <Button variant="secondary" onClick={() => setFilter('todos')}>Ver todos</Button>
            </div>
          ) : (
            <>
              <div className="documents-table" role="table" aria-label="Lista de documentos">
                <div className="documents-table__head" role="row">
                  <span role="columnheader">Documento</span>
                  <span role="columnheader">Status</span>
                  <span role="columnheader">Vencimento</span>
                  <span role="columnheader">Prazo</span>
                  <span role="columnheader">Ação</span>
                </div>
                {filteredDocuments.map((document, index) => {
                  const status = getStatus(document.days)
                  return (
                    <motion.div
                      className="documents-table__row"
                      role="row"
                      tabIndex={0}
                      key={document.id}
                      onClick={() => openDocument(document.id)}
                      onKeyDown={event => (event.key === 'Enter' || event.key === ' ') && openDocument(document.id)}
                      {...(reduceMotion ? {} : stagger(index))}
                    >
                      <div className="documents-table__document" role="cell">
                        <DocumentGlyph type={document.tipo} />
                        <div>
                          <strong>{document.apelido || LABELS[document.tipo] || document.tipo}</strong>
                          <span>{LABELS[document.tipo] || document.tipo}</span>
                        </div>
                      </div>
                      <div role="cell"><StatusPill status={status.id} label={status.label} /></div>
                      <time role="cell" dateTime={document.data_vencimento}>{formatarData(document.data_vencimento)}</time>
                      <div className="documents-table__days bz-data" role="cell">
                        {Math.abs(document.days).toString().padStart(2, '0')}d
                        <span>{document.days < 0 ? 'atrasado' : 'restantes'}</span>
                      </div>
                      <div className="documents-table__action" role="cell">
                        <Button variant="ghost" size="sm" onClick={event => markRenewed(document.id, event)} icon={<CheckCircle2 size={15} strokeWidth={1.75} />}>
                          Renovado
                        </Button>
                        <ChevronRight size={17} strokeWidth={1.75} aria-hidden="true" />
                      </div>
                      <progress
                        className={`documents-table__progress documents-table__progress--${status.id}`}
                        max={100}
                        value={progressFor(document.days)}
                        aria-label={`Proximidade do vencimento: ${progressFor(document.days)}%`}
                      />
                    </motion.div>
                  )
                })}
              </div>

              <div className="documents-cards">
                {filteredDocuments.map((document, index) => {
                  const status = getStatus(document.days)
                  return (
                    <motion.article
                      className="document-card"
                      key={document.id}
                      onClick={() => openDocument(document.id)}
                      {...(reduceMotion ? {} : stagger(index))}
                    >
                      <div className="document-card__head">
                        <DocumentGlyph type={document.tipo} />
                        <div className="document-card__identity">
                          <strong>{document.apelido || LABELS[document.tipo] || document.tipo}</strong>
                          <span>{LABELS[document.tipo] || document.tipo}</span>
                        </div>
                        <div className="document-card__days bz-data">
                          {Math.abs(document.days).toString().padStart(2, '0')}d
                          <span>{document.days < 0 ? 'atrasado' : 'restantes'}</span>
                        </div>
                      </div>
                      <div className="document-card__meta">
                        <StatusPill status={status.id} label={status.label} />
                        <time dateTime={document.data_vencimento}>{formatarData(document.data_vencimento)}</time>
                      </div>
                      <div className="document-card__footer">
                        <Button variant="ghost" size="sm" onClick={event => markRenewed(document.id, event)} icon={<CheckCircle2 size={15} strokeWidth={1.75} />}>Renovado</Button>
                        <span>Ver detalhes <ChevronRight size={15} strokeWidth={1.75} /></span>
                      </div>
                      <progress
                        className={`documents-table__progress documents-table__progress--${status.id}`}
                        max={100}
                        value={progressFor(document.days)}
                        aria-label={`Proximidade do vencimento: ${progressFor(document.days)}%`}
                      />
                    </motion.article>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {critical > 0 && (
          <aside className="dashboard-warning">
            <AlertTriangle size={18} strokeWidth={1.75} aria-hidden="true" />
            <p><strong>{critical} {critical === 1 ? 'documento exige' : 'documentos exigem'} ação.</strong> Prazos vencidos ou a até 7 dias aparecem como críticos.</p>
          </aside>
        )}
      </main>
    </div>
  )
}
