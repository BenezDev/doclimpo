import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  CheckCircle2,
  Clock3,
  Pencil,
  Trash2,
  WalletCards,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Brand,
  Button,
  DocumentGlyph,
  type DocumentStatus,
  StatusPill,
  ThemeToggle,
} from '../components/ui/Bezel'
import { EnderecoModal } from '../components/ui/EnderecoModal'
import { OndeRenovar } from '../components/ui/OndeRenovar'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../integrations/supabase/client'
import type { PerfilEndereco } from '../lib/endereco'
import type { Tables } from '../integrations/supabase/types'
import { bezelSpring, stagger } from '../lib/motion'

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

interface GuideStep {
  title: string
  description: string
  time: string
  cost: string
}

interface Guide {
  risk: string
  steps: GuideStep[]
}

const GUIDES: Record<string, Guide> = {
  cnh: {
    risk: 'Dirigir com a habilitação vencida pode gerar multa, pontos e retenção do documento.',
    steps: [
      { title: 'Consulte a situação no Detran', description: 'Confirme exigências, taxas e clínicas credenciadas no portal do seu estado.', time: '15–30 min', cost: 'Varia por estado' },
      { title: 'Faça os exames exigidos', description: 'Realize avaliação médica e, quando aplicável, avaliação psicológica.', time: '1–3 dias', cost: 'Consulte o Detran' },
      { title: 'Pague a taxa e protocole', description: 'Conclua o pedido pelos canais oficiais e guarde o comprovante.', time: '30 min', cost: 'Consulte o Detran' },
      { title: 'Acompanhe a emissão', description: 'Verifique o documento digital e o prazo de entrega da via física.', time: 'Prazo oficial', cost: 'Sem estimativa' },
    ],
  },
  crlv: {
    risk: 'Circular com o licenciamento irregular pode gerar multa e retenção do veículo.',
    steps: [
      { title: 'Consulte débitos do veículo', description: 'Verifique IPVA, multas e demais pendências nos canais oficiais.', time: '15 min', cost: 'Conforme débitos' },
      { title: 'Quite as pendências', description: 'Pague os valores identificados e aguarde a compensação bancária.', time: '1–3 dias', cost: 'Conforme débitos' },
      { title: 'Emita o CRLV digital', description: 'Acesse o aplicativo ou portal oficial após a regularização.', time: '10 min', cost: 'Sem estimativa' },
    ],
  },
  passaporte: {
    risk: 'Passaporte vencido impede o embarque internacional e pode comprometer toda a viagem.',
    steps: [
      { title: 'Preencha a solicitação oficial', description: 'Inicie o processo no portal da Polícia Federal e confira a documentação.', time: '20–40 min', cost: 'Taxa oficial vigente' },
      { title: 'Pague a guia', description: 'Quite a taxa emitida no processo e aguarde a compensação.', time: '1–3 dias', cost: 'Consulte a PF' },
      { title: 'Agende o atendimento', description: 'Escolha uma unidade disponível e compareça com os documentos originais.', time: 'Agenda local', cost: 'Sem estimativa' },
      { title: 'Acompanhe e retire', description: 'Consulte o protocolo até a liberação para retirada.', time: 'Prazo oficial', cost: 'Sem estimativa' },
    ],
  },
  ipva: {
    risk: 'O atraso acumula encargos e pode impedir o licenciamento regular do veículo.',
    steps: [
      { title: 'Consulte o calendário estadual', description: 'Confira vencimento e valor no portal da Secretaria da Fazenda.', time: '10 min', cost: 'Valor oficial' },
      { title: 'Escolha a forma de pagamento', description: 'Verifique as opções de cota única ou parcelamento disponíveis.', time: '10 min', cost: 'Conforme o veículo' },
      { title: 'Pague e guarde o comprovante', description: 'Use um canal bancário autorizado e acompanhe a compensação.', time: '1–3 dias', cost: 'Conforme o veículo' },
    ],
  },
  seguro: {
    risk: 'Uma apólice vencida deixa o veículo sem a cobertura contratada.',
    steps: [
      { title: 'Peça a proposta de renovação', description: 'Solicite condições atualizadas à seguradora ou ao corretor.', time: '30 min', cost: 'Cotação' },
      { title: 'Revise cobertura e franquia', description: 'Confira limites, assistências, condutores e exclusões.', time: '30–60 min', cost: 'Sem custo' },
      { title: 'Formalize a nova apólice', description: 'Assine, confirme a vigência e guarde os documentos.', time: '15 min', cost: 'Valor contratado' },
    ],
  },
}

const DEFAULT_GUIDE: Guide = {
  risk: 'As consequências variam conforme o documento e o órgão responsável.',
  steps: [
    { title: 'Consulte o órgão responsável', description: 'Confirme os documentos, requisitos e canais oficiais.', time: '15–30 min', cost: 'Consulte o órgão' },
    { title: 'Organize os comprovantes', description: 'Separe identificação, formulários e comprovantes necessários.', time: '30 min', cost: 'Sem estimativa' },
    { title: 'Protocole a renovação', description: 'Conclua o processo pelo canal oficial e acompanhe o pedido.', time: 'Prazo oficial', cost: 'Consulte o órgão' },
  ],
}

function parseDate(date: string) {
  const [year, month, day] = date.split('-')
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function daysRemaining(date: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((parseDate(date).getTime() - today.getTime()) / 86_400_000)
}

function formatLongDate(date: string) {
  return parseDate(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function getStatus(days: number): { id: DocumentStatus; label: string } {
  if (days < 0) return { id: 'vencido', label: 'Vencido' }
  if (days <= 7) return { id: 'critico', label: 'Crítico' }
  if (days <= 90) return { id: 'atencao', label: 'Atenção' }
  return { id: 'vigente', label: 'Vigente' }
}

export default function DocumentoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dark, toggleTheme } = useTheme()
  const { user } = useAuth()
  const reduceMotion = useReducedMotion()
  const [document, setDocument] = useState<Tables<'documentos'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [renewing, setRenewing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newNickname, setNewNickname] = useState('')
  const [perfilEndereco, setPerfilEndereco] = useState<PerfilEndereco | null>(null)
  const [mostrarEndereco, setMostrarEndereco] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const load = async () => {
      const { data, error } = await supabase.from('documentos').select('*').eq('id', id).single()
      if (cancelled) return
      setDocument(data)
      setLoadError(Boolean(error))
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [id])

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

  const markRenewed = async () => {
    if (!id) return
    setRenewing(true)
    await supabase.from('documentos').update({ resolvido: true }).eq('id', id)
    navigate('/dashboard')
  }

  const openEdit = () => {
    if (!document) return
    setNewDate(document.data_vencimento)
    setNewNickname(document.apelido || '')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!id || !document) return
    await supabase.from('documentos').update({
      data_vencimento: newDate || document.data_vencimento,
      apelido: newNickname || null,
    }).eq('id', id)
    setEditing(false)
    const { data } = await supabase.from('documentos').select('*').eq('id', id).single()
    setDocument(data)
  }

  const deleteDocument = async () => {
    if (!id) return
    await supabase.from('documentos').delete().eq('id', id)
    navigate('/dashboard')
  }

  if (!id || loading) {
    return (
      <div className="bz-page page-state">
        <span className="page-state__loader" />
        <p>{id ? 'Carregando documento…' : 'Documento não encontrado.'}</p>
      </div>
    )
  }

  if (loadError || !document) {
    return (
      <div className="bz-page page-state">
        <AlertTriangle size={28} strokeWidth={1.75} />
        <h1>Documento não encontrado</h1>
        <p>Ele pode ter sido removido ou não estar disponível para esta conta.</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>Voltar ao painel</Button>
      </div>
    )
  }

  const days = daysRemaining(document.data_vencimento)
  const status = getStatus(days)
  const guide = GUIDES[document.tipo] || DEFAULT_GUIDE
  const documentName = document.apelido || LABELS[document.tipo] || document.tipo

  return (
    <div className="bz-page detail-page">
      {mostrarEndereco && (
        <EnderecoModal
          inicial={perfilEndereco}
          onClose={() => setMostrarEndereco(false)}
          onSaved={(endereco) => { setPerfilEndereco(endereco); setMostrarEndereco(false) }}
        />
      )}

      {editing && (
        <div className="bz-modal-layer" onMouseDown={event => event.target === event.currentTarget && setEditing(false)}>
          <motion.div
            className="bz-modal bz-modal--compact"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-document-title"
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
            transition={reduceMotion ? undefined : bezelSpring}
          >
            <header className="bz-modal__header">
              <div>
                <h2 id="edit-document-title">Editar documento</h2>
                <p>ATUALIZAÇÃO DE PRAZO</p>
              </div>
              <button className="bz-icon-button" type="button" onClick={() => setEditing(false)} aria-label="Fechar">
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>
            <div className="bz-modal__body">
              <div className="bz-field">
                <label htmlFor="edit-date">Data de vencimento</label>
                <input className="bz-input" id="edit-date" type="date" value={newDate} onChange={event => setNewDate(event.target.value)} />
              </div>
              <div className="bz-field">
                <label htmlFor="edit-nickname">Apelido <span className="bz-field__optional">(opcional)</span></label>
                <input className="bz-input" id="edit-nickname" type="text" maxLength={80} value={newNickname} onChange={event => setNewNickname(event.target.value)} />
              </div>
              <div className="bz-modal__actions">
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button variant="primary" onClick={saveEdit}>Salvar alterações</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {confirmingDelete && (
        <div className="bz-modal-layer" onMouseDown={event => event.target === event.currentTarget && setConfirmingDelete(false)}>
          <motion.div
            className="bz-modal bz-modal--compact"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-document-title"
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            transition={reduceMotion ? undefined : bezelSpring}
          >
            <div className="bz-modal__body detail-delete-dialog">
              <span className="detail-delete-dialog__icon"><Trash2 size={22} strokeWidth={1.75} /></span>
              <h2 id="delete-document-title">Excluir {documentName}?</h2>
              <p>O prazo e o histórico vinculado deixam de aparecer no painel. Essa ação não pode ser desfeita.</p>
              <div className="bz-modal__actions">
                <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>Cancelar</Button>
                <Button variant="danger" onClick={deleteDocument}>Excluir documento</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <header className="bz-topbar">
        <div className="bz-container--wide bz-topbar__inner">
          <div className="detail-topbar__start">
            <button className="bz-icon-button" type="button" onClick={() => navigate('/dashboard')} aria-label="Voltar ao painel">
              <ArrowLeft size={18} strokeWidth={1.75} />
            </button>
            <Brand />
          </div>
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="bz-container--wide detail-main">
        <section className="detail-heading">
          <div className="detail-heading__identity">
            <DocumentGlyph type={document.tipo} size="lg" />
            <div>
              <span className="bz-micro">{LABELS[document.tipo] || document.tipo}</span>
              <h1>{documentName}</h1>
              <StatusPill status={status.id} label={status.label} />
            </div>
          </div>
          <div className="detail-heading__actions">
            <Button variant="secondary" onClick={openEdit} icon={<Pencil size={16} strokeWidth={1.75} />}>Editar</Button>
            <Button variant="ghost" onClick={() => setConfirmingDelete(true)} icon={<Trash2 size={16} strokeWidth={1.75} />}>Excluir</Button>
          </div>
        </section>

        <div className="detail-grid">
          <div className="detail-priority-column">
            <section className={`detail-countdown detail-countdown--${status.id}`}>
              <span className="bz-micro">{days < 0 ? 'Prazo ultrapassado' : 'Tempo restante'}</span>
              <div className="detail-countdown__value bz-data">{Math.abs(days).toString().padStart(2, '0')}<span>dias</span></div>
              <div className="detail-countdown__date">
                <span>Vencimento</span>
                <time dateTime={document.data_vencimento}>{formatLongDate(document.data_vencimento)}</time>
              </div>
              <Button variant="primary" size="lg" disabled={renewing} onClick={markRenewed} icon={<CheckCircle2 size={18} strokeWidth={1.75} />}>
                {renewing ? 'Atualizando…' : 'Marcar como renovado'}
              </Button>
            </section>

            <OndeRenovar tipo={document.tipo} perfil={perfilEndereco} onCadastrarEndereco={() => setMostrarEndereco(true)} />

            <section className="detail-panel detail-risk">
              <div className="detail-panel__title">
                <AlertTriangle size={18} strokeWidth={1.75} />
                <div>
                  <span className="bz-micro">Custo do descuido</span>
                  <h2>Se o prazo passar</h2>
                </div>
              </div>
              <p>{guide.risk}</p>
              <small>Confirme regras e valores atuais no órgão responsável antes de agir.</small>
            </section>

            <section className="detail-panel">
              <div className="detail-panel__title">
                <BellRing size={18} strokeWidth={1.75} />
                <div>
                  <span className="bz-micro">Notificações</span>
                  <h2>Alertas configurados</h2>
                </div>
              </div>
              <div className="detail-alert-list">
                {[90, 30, 7, 1].map(window => (
                  <div className="detail-alert-list__row" key={window}>
                    <span className="bz-data">D-{window.toString().padStart(2, '0')}</span>
                    <p>{window === 1 ? '1 dia antes' : `${window} dias antes`}</p>
                    <strong>E-mail</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="detail-guide">
            <div className="detail-guide__header">
              <span className="bz-micro">Roteiro de renovação</span>
              <h2>Próximos passos para {LABELS[document.tipo] || document.tipo}</h2>
              <p>Use isto como checklist inicial. Regras, taxas e prazos oficiais podem mudar.</p>
            </div>
            <div className="detail-guide__steps">
              {guide.steps.map((step, index) => (
                <motion.article className="detail-guide__step" key={step.title} {...(reduceMotion ? {} : stagger(index))}>
                  <div className="detail-guide__rail">
                    <span className="bz-data">{(index + 1).toString().padStart(2, '0')}</span>
                    {index < guide.steps.length - 1 && <i />}
                  </div>
                  <div className="detail-guide__content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    <div className="detail-guide__meta">
                      <span><Clock3 size={14} strokeWidth={1.75} />{step.time}</span>
                      <span><WalletCards size={14} strokeWidth={1.75} />{step.cost}</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
