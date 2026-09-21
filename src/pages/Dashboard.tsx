import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  CarFront,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FilePlus2,
  LogOut,
  Plus,
  Siren,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AddDocumentModal } from '../components/ui/AddDocumentModal'
import { EnderecoModal } from '../components/ui/EnderecoModal'
import { PlanosModal } from '../components/ui/PlanosModal'
import { RenovarDialog } from '../components/ui/RenovarDialog'
import { VeiculoForm } from '../components/ui/VeiculoForm'
import {
  Brand,
  Button,
  DocumentGlyph,
  StatusPill,
  ThemeToggle,
} from '../components/ui/Bezel'
import { useAuth } from '../hooks/useAuth'
import { usePlano } from '../hooks/usePlano'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../integrations/supabase/client'
import { precisaPedirEndereco, type PerfilEndereco } from '../lib/endereco'
import { linksConsultaMultas } from '../lib/multas'
import { podeAdicionarDocumento, rotuloPlano } from '../lib/planos'
import { LIMITE_VEICULOS, formatarPlaca, type Veiculo } from '../lib/veiculos'
import { diasRestantes, formatarData, statusPorDias } from '../lib/datas'
import { bezelSpring, stagger } from '../lib/motion'

interface Documento {
  id: string
  tipo: string
  apelido: string | null
  data_vencimento: string
  resolvido: boolean
}

type Filter = 'todos' | 'atencao' | 'criticos' | 'resolvidos'

const LABELS: Record<string, string> = {
  cnh: 'CNH',
  crlv: 'CRLV',
  ipva: 'IPVA',
  multa: 'Multa de trânsito',
  passaporte: 'Passaporte',
  rg: 'RG',
  seguro: 'Seguro auto',
  plano_saude: 'Plano de saúde',
  carteira_trabalho: 'Carteira de trabalho',
  garantia: 'Garantia',
  contrato: 'Contrato',
  exame: 'Exame periódico',
  alvara: 'Alvará',
  certidao: 'Certidão negativa',
  das_mei: 'DAS-MEI',
  outro: 'Outro',
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
  // null = fechado; tipo/veículo pré-escolhidos vêm do card "Seu carro".
  const [modal, setModal] = useState<{ tipo?: string; veiculo?: Veiculo } | null>(null)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [version, setVersion] = useState(0)
  const [filter, setFilter] = useState<Filter>('todos')
  const [resolvidos, setResolvidos] = useState<Documento[]>([])
  const [renovando, setRenovando] = useState<Documento | null>(null)
  const [perfilEndereco, setPerfilEndereco] = useState<PerfilEndereco | null>(null)
  const [mostrarEndereco, setMostrarEndereco] = useState(false)
  const { plano, recarregar: recarregarPlano } = usePlano()
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

  // Histórico: só quando a aba é aberta. Fica fora de `docs`, que alimenta o
  // gate do plano (documentos ativos).
  useEffect(() => {
    if (!user || filter !== 'resolvidos') return
    let cancelled = false
    supabase
      .from('documentos')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('resolvido', true)
      .order('atualizado_em', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (!cancelled) setResolvidos(data || []) })
    return () => { cancelled = true }
  }, [user, filter, version])

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

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('veiculos')
      .select('id, placa, uf, apelido')
      .eq('usuario_id', user.id)
      .order('criado_em')
      .then(({ data }) => { if (!cancelled) setVeiculos(data ?? []) })
    return () => { cancelled = true }
  }, [user])

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
        recarregarPlano()
        setAvisoCheckout({ tipo: 'sucesso', texto: 'Assinatura ativa. Seus documentos agora são ilimitados.' })
      } else if (resultado === 'canceled') {
        setAvisoCheckout({ tipo: 'neutro', texto: 'Pagamento não concluído. Seu plano continua o mesmo.' })
      }
      navigate('/dashboard', { replace: true })
    }
    concluir()
    return () => { cancelled = true }
  }, [search, navigate, recarregarPlano])

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
  const abrirAdicionar = (tipo?: string, veiculo?: Veiculo) => {
    if (podeAdicionarDocumento(plano, docs.length)) setModal({ tipo, veiculo })
    else setMostrarPlanos(true)
  }

  const abrirPlanosPorLimite = () => {
    setModal(null)
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

  const abrirRenovacao = (documento: Documento, event: React.MouseEvent) => {
    event.stopPropagation()
    setRenovando(documento)
  }

  const historico = filter === 'resolvidos'
  const linhas = historico
    ? resolvidos.map(document => ({ ...document, days: diasRestantes(document.data_vencimento) }))
    : filteredDocuments

  const openDocument = (id: string) => navigate(`/documento/${id}`)

  return (
    <div className="bz-page dashboard-page">
      {mostrarPlanos && (
        <PlanosModal motivo={podeAdicionarDocumento(plano, docs.length) ? 'escolha' : 'limite'} planoAtual={plano} onClose={() => setMostrarPlanos(false)} />
      )}
      {renovando && (
        <RenovarDialog
          documento={renovando}
          nome={renovando.apelido || LABELS[renovando.tipo] || renovando.tipo}
          onClose={() => setRenovando(null)}
          onRenovado={() => { setRenovando(null); reloadDocuments() }}
          onEncerrado={() => { setRenovando(null); reloadDocuments() }}
        />
      )}

      {modal && (
        <AddDocumentModal
          dark={dark}
          onClose={() => setModal(null)}
          onLimite={abrirPlanosPorLimite}
          mostrarEmpresariais={plano === 'MEI'}
          ufPadrao={perfilEndereco?.uf}
          tipoInicial={modal.tipo}
          veiculo={modal.veiculo ?? veiculos[0]}
          onSuccess={() => {
            setModal(null)
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
          <Button variant="primary" size="lg" onClick={() => abrirAdicionar()} icon={<Plus size={18} strokeWidth={1.75} />}>
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

        <section className="detail-panel dashboard-veiculo" aria-labelledby="dashboard-veiculo-titulo">
          <div className="detail-panel__title">
            <CarFront size={18} strokeWidth={1.75} />
            <div>
              <span className="bz-micro">Seu carro{veiculos.length > 0 && ` · ${veiculos.length}/${LIMITE_VEICULOS}`}</span>
              <h2 id="dashboard-veiculo-titulo">{veiculos.length > 0 ? 'Multas, IPVA e licenciamento' : 'Cadastre a placa'}</h2>
            </div>
          </div>
          {veiculos.length === 0 ? (
            <>
              <p>Com a placa e a UF, você tem aqui os links oficiais para consultar multas, IPVA e licenciamento — e cadastra o prazo da multa em um toque.</p>
              <VeiculoForm compacto ufPadrao={perfilEndereco?.uf} onSalvo={veiculo => setVeiculos(atual => [...atual, veiculo])} />
            </>
          ) : (
            <ul className="dashboard-veiculo__lista">
              {veiculos.map(veiculo => (
                <li className="dashboard-veiculo__linha" key={veiculo.id}>
                  <div className="dashboard-veiculo__placa">
                    <strong className="bz-data">{formatarPlaca(veiculo.placa)}</strong>
                    <span>{veiculo.uf}{veiculo.apelido ? ` · ${veiculo.apelido}` : ''}</span>
                  </div>
                  <div className="dashboard-veiculo__acoes">
                    {linksConsultaMultas(veiculo.uf).map(fonte => (
                      <a className="onde-renovar__link" key={fonte.url} href={fonte.url} target="_blank" rel="noopener noreferrer">
                        {fonte.rotulo} <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
                      </a>
                    ))}
                    <Button variant="primary" size="sm" onClick={() => abrirAdicionar('multa', veiculo)} icon={<Siren size={15} strokeWidth={1.75} />}>Cadastrar multa</Button>
                    <Button variant="ghost" size="sm" onClick={() => abrirAdicionar(undefined, veiculo)}>IPVA / licenciamento</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <small>Links oficiais: você se identifica no órgão. O DocLimpo não consulta multas nem recebe pagamentos. <Link to="/conta">Gerenciar veículos</Link></small>
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
                ['resolvidos', 'Resolvidos'],
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
          ) : historico && linhas.length === 0 ? (
            <div className="documents-empty documents-empty--compact">
              <span className="documents-empty__icon"><CheckCircle2 size={24} strokeWidth={1.75} /></span>
              <h3>Nenhum documento resolvido</h3>
              <p>Quando você marcar um documento como renovado, o prazo anterior fica guardado aqui.</p>
              <Button variant="secondary" onClick={() => setFilter('todos')}>Ver ativos</Button>
            </div>
          ) : !historico && docs.length === 0 ? (
            <div className="documents-empty">
              <span className="documents-empty__icon"><FilePlus2 size={28} strokeWidth={1.75} /></span>
              <h3>Nenhum documento ainda</h3>
              <p>Cadastre o primeiro prazo para o painel começar a trabalhar.</p>
              <Button variant="primary" onClick={() => abrirAdicionar()} icon={<Plus size={17} strokeWidth={1.75} />}>Cadastrar primeiro documento</Button>
            </div>
          ) : !historico && filteredDocuments.length === 0 ? (
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
                {linhas.map((document, index) => {
                  const status = historico ? { id: 'resolvido' as const, label: 'Resolvido' } : statusPorDias(document.days)
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
                        {historico ? '—' : `${Math.abs(document.days).toString().padStart(2, '0')}d`}
                        <span>{historico ? 'encerrado' : document.days < 0 ? 'atrasado' : 'restantes'}</span>
                      </div>
                      <div className="documents-table__action" role="cell">
                        {!historico && (
                          <Button variant="ghost" size="sm" onClick={event => abrirRenovacao(document, event)} icon={<CheckCircle2 size={15} strokeWidth={1.75} />}>
                            {document.tipo === 'multa' ? 'Resolvida' : 'Renovado'}
                          </Button>
                        )}
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
                {linhas.map((document, index) => {
                  const status = historico ? { id: 'resolvido' as const, label: 'Resolvido' } : statusPorDias(document.days)
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
                          {historico ? '—' : `${Math.abs(document.days).toString().padStart(2, '0')}d`}
                          <span>{historico ? 'encerrado' : document.days < 0 ? 'atrasado' : 'restantes'}</span>
                        </div>
                      </div>
                      <div className="document-card__meta">
                        <StatusPill status={status.id} label={status.label} />
                        <time dateTime={document.data_vencimento}>{formatarData(document.data_vencimento)}</time>
                      </div>
                      <div className="document-card__footer">
                        {!historico && <Button variant="ghost" size="sm" onClick={event => abrirRenovacao(document, event)} icon={<CheckCircle2 size={15} strokeWidth={1.75} />}>{document.tipo === 'multa' ? 'Resolvida' : 'Renovado'}</Button>}
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
