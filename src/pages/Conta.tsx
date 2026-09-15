import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  BellRing,
  CircleAlert,
  CheckCircle2,
  Download,
  KeyRound,
  MailCheck,
  MapPin,
  Send,
  Trash2,
  UserMinus,
  UserRound,
  Users,
  WalletCards,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Brand, Button, ThemeToggle } from '../components/ui/Bezel'
import { EnderecoModal } from '../components/ui/EnderecoModal'
import { PlanosModal } from '../components/ui/PlanosModal'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../integrations/supabase/client'
import { validateNewPassword } from '../lib/access-flow'
import { resumoEndereco, temEndereco, type PerfilEndereco } from '../lib/endereco'
import { bezelSpring } from '../lib/motion'
import { LIMITE_PESSOAS_FAMILIA, ehPago, formatarPreco, normalizarPlano, planoPorId, rotuloPlano, urlStripeSegura, type PlanType } from '../lib/planos'
import { conviteSchema } from '../lib/validacao'

interface PerfilConta extends PerfilEndereco {
  nome: string | null
  email: string | null
  notification_email: boolean
  plan_type: string
}

const CAMPOS_PERFIL = 'nome, email, notification_email, plan_type, cep, logradouro, numero, complemento, bairro, cidade, uf, ibge, latitude, longitude'

const ENDERECO_VAZIO: PerfilEndereco = {
  cep: null, logradouro: null, numero: null, complemento: null, bairro: null,
  cidade: null, uf: null, ibge: null, latitude: null, longitude: null,
}

type Aviso = { tipo: 'sucesso' | 'erro'; texto: string } | null

interface Membro { id: string; email: string; status: string; user_id: string | null }
interface Familia { papel: 'titular' | 'membro'; familiaId: string; titularNome: string | null }

// Mensagem de erro devolvida por uma Edge Function (FunctionsHttpError guarda a Response em `context`).
async function mensagemDaFuncao(error: unknown, padrao: string): Promise<string> {
  const contexto = (error as { context?: Response } | null)?.context
  if (!contexto) return padrao
  try {
    const corpo = await contexto.clone().json() as { error?: string }
    return typeof corpo.error === 'string' ? corpo.error : padrao
  } catch { return padrao }
}

function Feedback({ aviso }: { aviso: Aviso }) {
  if (!aviso) return null
  const erro = aviso.tipo === 'erro'
  return (
    <div className={`bz-feedback ${erro ? 'bz-feedback--danger' : 'bz-feedback--success'}`} role={erro ? 'alert' : 'status'}>
      {erro ? <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" /> : <CheckCircle2 size={17} strokeWidth={1.75} aria-hidden="true" />}
      <p>{aviso.texto}</p>
    </div>
  )
}

export default function Conta() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { user, signOut } = useAuth()
  const { dark, toggleTheme } = useTheme()
  const reduceMotion = useReducedMotion()

  const [perfil, setPerfil] = useState<PerfilConta | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [mostrarEndereco, setMostrarEndereco] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const [avisoAlertas, setAvisoAlertas] = useState<Aviso>(null)
  const [enviandoTeste, setEnviandoTeste] = useState(false)
  const [salvandoPreferencia, setSalvandoPreferencia] = useState(false)

  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [avisoSenha, setAvisoSenha] = useState<Aviso>(null)
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const [avisoDados, setAvisoDados] = useState<Aviso>(null)
  const [exportando, setExportando] = useState(false)

  const [plano, setPlano] = useState<PlanType>('FREE')
  const [familia, setFamilia] = useState<Familia | null>(null)
  const [membros, setMembros] = useState<Membro[]>([])
  const [familiaVersao, setFamiliaVersao] = useState(0)
  const [mostrarPlanos, setMostrarPlanos] = useState(false)
  const [abrindoPortal, setAbrindoPortal] = useState(false)
  const [avisoPlano, setAvisoPlano] = useState<Aviso>(null)
  const [emailConvite, setEmailConvite] = useState('')
  const [convidando, setConvidando] = useState(false)
  const [avisoFamilia, setAvisoFamilia] = useState<Aviso>(null)

  const nome = perfil?.nome || user?.user_metadata?.nome || user?.email?.split('@')[0] || 'usuário'
  const email = user?.email ?? perfil?.email ?? ''
  const planoProprioPago = ehPago(normalizarPlano(perfil?.plan_type))
  const planoHerdado = !planoProprioPago && ehPago(plano) && familia?.papel === 'membro'

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('profiles')
      .select(CAMPOS_PERFIL)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setPerfil(data as PerfilConta | null)
        setCarregando(false)
      })
    return () => { cancelled = true }
  }, [user])

  // Plano efetivo (inclui o herdado da família) + situação familiar. Sem a
  // função no banco (migration pendente), cai no plan_type do perfil.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const carregar = async () => {
      const { data: efetivo, error } = await supabase.rpc('meu_plano')
      if (cancelled) return
      if (!error && typeof efetivo === 'string') setPlano(normalizarPlano(efetivo))
      else setPlano(normalizarPlano(perfil?.plan_type))

      const { data: situacao } = await supabase.rpc('minha_familia')
      if (cancelled) return
      const linha = Array.isArray(situacao) ? situacao[0] : null
      setFamilia(linha ? { papel: linha.papel === 'titular' ? 'titular' : 'membro', familiaId: linha.familia_id, titularNome: linha.titular_nome } : null)

      const { data: lista } = await supabase.from('familia_membros').select('id, email, status, user_id').order('criado_em')
      if (!cancelled) setMembros(lista ?? [])
    }
    carregar()
    return () => { cancelled = true }
  }, [user, perfil?.plan_type, familiaVersao])

  // Link do e-mail de convite: /conta?convite=<token>
  useEffect(() => {
    const token = new URLSearchParams(search).get('convite')
    if (!token || !user) return
    let cancelled = false
    const aceitar = async () => {
      const { data, error } = await supabase.functions.invoke<{ titular?: string | null }>('aceitar-convite', { body: { token } })
      if (cancelled) return
      if (error) setAvisoPlano({ tipo: 'erro', texto: await mensagemDaFuncao(error, 'Não foi possível aceitar o convite.') })
      else {
        setAvisoPlano({ tipo: 'sucesso', texto: `Você entrou na família${data?.titular ? ` de ${data.titular}` : ''}. Seus documentos agora são ilimitados.` })
        setFamiliaVersao(value => value + 1)
      }
      navigate('/conta', { replace: true })
    }
    aceitar()
    return () => { cancelled = true }
  }, [search, user, navigate])

  const abrirPortal = async () => {
    setAbrindoPortal(true)
    setAvisoPlano(null)
    const { data, error } = await supabase.functions.invoke<{ url?: string }>('customer-portal', { body: {} })
    const destino = urlStripeSegura(data?.url)
    if (error || !destino) {
      setAbrindoPortal(false)
      setAvisoPlano({ tipo: 'erro', texto: await mensagemDaFuncao(error, 'Não foi possível abrir o portal agora.') })
      return
    }
    window.location.assign(destino)
  }

  const convidar = async (event: React.FormEvent) => {
    event.preventDefault()
    const validado = conviteSchema.safeParse({ email: emailConvite })
    if (!validado.success) { setAvisoFamilia({ tipo: 'erro', texto: validado.error.issues[0]?.message ?? 'Informe um e-mail válido.' }); return }
    setConvidando(true)
    setAvisoFamilia(null)
    const { error } = await supabase.functions.invoke('convidar-familiar', { body: { email: validado.data.email } })
    setConvidando(false)
    if (error) { setAvisoFamilia({ tipo: 'erro', texto: await mensagemDaFuncao(error, 'Não foi possível convidar agora.') }); return }
    setEmailConvite('')
    setAvisoFamilia({ tipo: 'sucesso', texto: `Convite enviado para ${validado.data.email}. Vale por 7 dias.` })
    setFamiliaVersao(value => value + 1)
  }

  const removerMembro = async (membro: Membro) => {
    const { error } = await supabase.from('familia_membros').delete().eq('id', membro.id)
    if (error) { setAvisoFamilia({ tipo: 'erro', texto: 'Não foi possível remover agora.' }); return }
    setAvisoFamilia({ tipo: 'sucesso', texto: membro.status === 'ativo' ? `${membro.email} saiu da família.` : `Convite para ${membro.email} cancelado.` })
    setFamiliaVersao(value => value + 1)
  }

  const sairDaFamilia = async () => {
    if (!user) return
    const { error } = await supabase.from('familia_membros').delete().eq('user_id', user.id)
    if (error) { setAvisoPlano({ tipo: 'erro', texto: 'Não foi possível sair agora.' }); return }
    setAvisoPlano({ tipo: 'sucesso', texto: 'Você saiu da família. Seus documentos continuam salvos; o plano volta ao gratuito.' })
    setFamiliaVersao(value => value + 1)
  }

  const alternarAlertas = async (ativo: boolean) => {
    if (!user) return
    setSalvandoPreferencia(true)
    setAvisoAlertas(null)
    const { error } = await supabase.from('profiles').update({ notification_email: ativo }).eq('user_id', user.id)
    setSalvandoPreferencia(false)
    if (error) { setAvisoAlertas({ tipo: 'erro', texto: 'Não foi possível salvar a preferência agora. Tente novamente.' }); return }
    setPerfil(atual => atual ? { ...atual, notification_email: ativo } : atual)
    setAvisoAlertas({ tipo: 'sucesso', texto: ativo ? 'Alertas por e-mail ativados.' : 'Alertas por e-mail pausados. Nenhum aviso será enviado até você reativar.' })
  }

  const enviarTeste = async () => {
    setEnviandoTeste(true)
    setAvisoAlertas(null)
    const { error } = await supabase.functions.invoke('send-test-notification', { body: {} })
    setEnviandoTeste(false)
    if (error) { setAvisoAlertas({ tipo: 'erro', texto: await mensagemDaFuncao(error, 'Não foi possível enviar o teste agora. Tente novamente em instantes.') }); return }
    setAvisoAlertas({ tipo: 'sucesso', texto: `E-mail de teste enviado para ${email}. Confira também a pasta de spam.` })
  }

  const salvarSenha = async (event: React.FormEvent) => {
    event.preventDefault()
    const invalido = validateNewPassword(senha, confirmacao)
    if (invalido) { setAvisoSenha({ tipo: 'erro', texto: invalido }); return }
    setSalvandoSenha(true)
    setAvisoSenha(null)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvandoSenha(false)
    if (error) { setAvisoSenha({ tipo: 'erro', texto: 'Não foi possível alterar a senha. Saia e entre de novo antes de tentar.' }); return }
    setSenha('')
    setConfirmacao('')
    setAvisoSenha({ tipo: 'sucesso', texto: 'Senha alterada.' })
  }

  const removerEndereco = async () => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ ...ENDERECO_VAZIO, endereco_atualizado_em: new Date().toISOString() })
      .eq('user_id', user.id)
    if (error) return
    setPerfil(atual => atual ? { ...atual, ...ENDERECO_VAZIO } : atual)
  }

  const exportarDados = async () => {
    if (!user) return
    setExportando(true)
    setAvisoDados(null)
    const [{ data: documentos }, { data: notificacoes }] = await Promise.all([
      supabase.from('documentos').select('*').eq('usuario_id', user.id).order('data_vencimento'),
      supabase.from('notifications').select('*').eq('usuario_id', user.id).order('scheduled_date'),
    ])
    const pacote = {
      exportado_em: new Date().toISOString(),
      conta: { id: user.id, email, criado_em: user.created_at },
      perfil,
      documentos: documentos ?? [],
      alertas: notificacoes ?? [],
    }
    const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `doclimpo-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setExportando(false)
    setAvisoDados({ tipo: 'sucesso', texto: 'Arquivo gerado. Ele contém tudo o que guardamos sobre a sua conta.' })
  }

  const excluirConta = async () => {
    setExcluindo(true)
    const { error } = await supabase.functions.invoke('delete-account', { body: {} })
    if (error) {
      setExcluindo(false)
      setConfirmandoExclusao(false)
      setAvisoDados({ tipo: 'erro', texto: await mensagemDaFuncao(error, 'Não foi possível excluir a conta agora. Nada foi apagado. Tente novamente.') })
      return
    }
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="bz-page dashboard-page">
      {mostrarPlanos && <PlanosModal motivo="escolha" planoAtual={plano} onClose={() => setMostrarPlanos(false)} />}

      {mostrarEndereco && (
        <EnderecoModal
          inicial={perfil}
          onClose={() => setMostrarEndereco(false)}
          onSaved={(endereco) => { setPerfil(atual => atual ? { ...atual, ...endereco } : atual); setMostrarEndereco(false) }}
        />
      )}

      {confirmandoExclusao && (
        <div className="bz-modal-layer" onMouseDown={event => event.target === event.currentTarget && !excluindo && setConfirmandoExclusao(false)}>
          <motion.div
            className="bz-modal bz-modal--compact"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="excluir-conta-title"
            initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
            transition={reduceMotion ? undefined : bezelSpring}
          >
            <div className="bz-modal__body detail-delete-dialog">
              <span className="detail-delete-dialog__icon"><Trash2 size={22} strokeWidth={1.75} /></span>
              <h2 id="excluir-conta-title">Excluir sua conta?</h2>
              <p>Perfil, endereço, documentos e alertas são apagados e o acesso é encerrado. Essa ação não pode ser desfeita. Se quiser guardar uma cópia, exporte seus dados antes.</p>
              <div className="bz-modal__actions">
                <Button variant="secondary" disabled={excluindo} onClick={() => setConfirmandoExclusao(false)}>Cancelar</Button>
                <Button variant="danger" disabled={excluindo} onClick={excluirConta}>{excluindo ? 'Excluindo…' : 'Excluir conta'}</Button>
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

      <main className="bz-container--wide dashboard-main conta-main">
        <section className="dashboard-heading conta-heading">
          <div className="conta-identity">
            <span className="conta-avatar" aria-hidden="true"><UserRound size={22} strokeWidth={1.75} /></span>
            <div>
              <span className="bz-micro">Minha conta</span>
              <h1>{nome}</h1>
              <p>{email}</p>
            </div>
          </div>
        </section>

        <div className="conta-grid">
          <section className="detail-panel" aria-labelledby="conta-alertas">
            <div className="detail-panel__title">
              <BellRing size={18} strokeWidth={1.75} />
              <div>
                <span className="bz-micro">Alertas</span>
                <h2 id="conta-alertas">Avisos por e-mail</h2>
              </div>
            </div>
            <label className="conta-switch">
              <input
                type="checkbox"
                role="switch"
                checked={perfil?.notification_email ?? true}
                disabled={carregando || salvandoPreferencia}
                onChange={event => alternarAlertas(event.target.checked)}
              />
              <span className="conta-switch__track" aria-hidden="true"><span className="conta-switch__thumb" /></span>
              <span className="conta-switch__label">
                <strong>Receber alertas em {email}</strong>
                <small>Janelas de 90, 30, 7 e 1 dia antes de cada vencimento.</small>
              </span>
            </label>
            <div className="conta-actions">
              <Button variant="secondary" size="sm" disabled={enviandoTeste || carregando} onClick={enviarTeste} icon={<MailCheck size={15} strokeWidth={1.75} />}>
                {enviandoTeste ? 'Enviando…' : 'Enviar e-mail de teste'}
              </Button>
            </div>
            <Feedback aviso={avisoAlertas} />
            <small>O teste confirma que os avisos chegam à sua caixa de entrada. Limite de um teste por minuto.</small>
          </section>

          <section className="detail-panel" aria-labelledby="conta-senha">
            <div className="detail-panel__title">
              <KeyRound size={18} strokeWidth={1.75} />
              <div>
                <span className="bz-micro">Segurança</span>
                <h2 id="conta-senha">Trocar senha</h2>
              </div>
            </div>
            <form onSubmit={salvarSenha}>
              <div className="bz-field">
                <label htmlFor="conta-nova-senha">Nova senha</label>
                <input className="bz-input" id="conta-nova-senha" type="password" autoComplete="new-password" minLength={6} required value={senha} onChange={event => setSenha(event.target.value)} placeholder="Mínimo de 6 caracteres" />
              </div>
              <div className="bz-field">
                <label htmlFor="conta-confirmar-senha">Confirmar nova senha</label>
                <input className="bz-input" id="conta-confirmar-senha" type="password" autoComplete="new-password" minLength={6} required value={confirmacao} onChange={event => setConfirmacao(event.target.value)} placeholder="Repita a senha" />
              </div>
              <Feedback aviso={avisoSenha} />
              <div className="conta-actions">
                <Button type="submit" variant="secondary" size="sm" disabled={salvandoSenha}>{salvandoSenha ? 'Salvando…' : 'Salvar nova senha'}</Button>
              </div>
            </form>
          </section>

          <section className="detail-panel" aria-labelledby="conta-endereco">
            <div className="detail-panel__title">
              <MapPin size={18} strokeWidth={1.75} />
              <div>
                <span className="bz-micro">Endereço</span>
                <h2 id="conta-endereco">Onde renovar perto de você</h2>
              </div>
            </div>
            <p>{temEndereco(perfil) ? resumoEndereco(perfil) : 'Nenhum endereço cadastrado. É opcional: serve só para indicar a unidade de renovação mais próxima.'}</p>
            <div className="conta-actions">
              <Button variant="secondary" size="sm" disabled={carregando} onClick={() => setMostrarEndereco(true)} icon={<MapPin size={15} strokeWidth={1.75} />}>
                {temEndereco(perfil) ? 'Editar endereço' : 'Cadastrar endereço'}
              </Button>
              {temEndereco(perfil) && <Button variant="ghost" size="sm" onClick={removerEndereco}>Remover endereço</Button>}
            </div>
          </section>

          <section className="detail-panel" aria-labelledby="conta-plano">
            <div className="detail-panel__title">
              <WalletCards size={18} strokeWidth={1.75} />
              <div>
                <span className="bz-micro">Plano</span>
                <h2 id="conta-plano">{rotuloPlano(plano)}{planoProprioPago && ` · ${formatarPreco(planoPorId(plano)?.precoCentavos ?? 0)}/mês`}</h2>
              </div>
            </div>
            {planoHerdado ? (
              <p>Plano herdado da família{familia?.titularNome ? ` de ${familia.titularNome}` : ''}: documentos ilimitados enquanto você fizer parte dela.</p>
            ) : planoProprioPago ? (
              <p>Documentos ilimitados, alertas por e-mail e guia de renovação. Cartão, faturas e cancelamento ficam no portal de cobrança.</p>
            ) : (
              <p>Um documento monitorado, alertas por e-mail e guia de renovação. Sem cartão. Para acompanhar mais documentos, assine um plano.</p>
            )}
            <Feedback aviso={avisoPlano} />
            <div className="conta-actions">
              {planoHerdado ? (
                <Button variant="ghost" size="sm" onClick={sairDaFamilia} icon={<UserMinus size={15} strokeWidth={1.75} />}>Sair da família</Button>
              ) : planoProprioPago ? (
                <Button variant="secondary" size="sm" disabled={abrindoPortal} onClick={abrirPortal} icon={<WalletCards size={15} strokeWidth={1.75} />}>
                  {abrindoPortal ? 'Abrindo…' : 'Gerenciar assinatura'}
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setMostrarPlanos(true)}>Ver planos</Button>
              )}
            </div>
            <small>Condições completas nos <Link to="/termos">termos de uso</Link>.</small>
          </section>

          {perfil?.plan_type === 'FAMILIAR' && (
            <section className="detail-panel" aria-labelledby="conta-familia">
              <div className="detail-panel__title">
                <Users size={18} strokeWidth={1.75} />
                <div>
                  <span className="bz-micro">Família · {1 + membros.length}/{LIMITE_PESSOAS_FAMILIA} pessoas</span>
                  <h2 id="conta-familia">Quem faz parte</h2>
                </div>
              </div>
              <ul className="conta-membros">
                <li><strong>{nome}</strong><span>{email}</span><em>Titular</em></li>
                {membros.map(membro => (
                  <li key={membro.id}>
                    <strong>{membro.email}</strong>
                    <span>{membro.status === 'ativo' ? 'Ativo' : 'Convite pendente'}</span>
                    <button className="conta-membros__remover" type="button" onClick={() => removerMembro(membro)} aria-label={`Remover ${membro.email}`}>
                      <UserMinus size={15} strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
              {1 + membros.length < LIMITE_PESSOAS_FAMILIA ? (
                <form className="conta-convite" onSubmit={convidar}>
                  <div className="bz-field">
                    <label htmlFor="conta-convite-email">Convidar por e-mail</label>
                    <input className="bz-input" id="conta-convite-email" type="email" autoComplete="off" maxLength={254} required value={emailConvite} onChange={event => setEmailConvite(event.target.value)} placeholder="nome@exemplo.com" />
                  </div>
                  <Button type="submit" variant="secondary" size="sm" disabled={convidando} icon={<Send size={15} strokeWidth={1.75} />}>
                    {convidando ? 'Enviando…' : 'Convidar'}
                  </Button>
                </form>
              ) : (
                <p>Sua família está completa. Remova alguém para convidar outra pessoa.</p>
              )}
              <Feedback aviso={avisoFamilia} />
              <small>Cada pessoa entra com a própria conta, usando o e-mail convidado, e cuida dos próprios documentos. Ninguém vê os documentos dos outros.</small>
            </section>
          )}

          <section className="detail-panel conta-panel--dados" aria-labelledby="conta-dados">
            <div className="detail-panel__title">
              <Download size={18} strokeWidth={1.75} />
              <div>
                <span className="bz-micro">Seus dados</span>
                <h2 id="conta-dados">Exportar ou excluir</h2>
              </div>
            </div>
            <p>Baixe uma cópia de tudo o que guardamos sobre você, ou exclua a conta e todos os dados de uma vez. Detalhes na <Link to="/privacidade">política de privacidade</Link>.</p>
            <Feedback aviso={avisoDados} />
            <div className="conta-actions">
              <Button variant="secondary" size="sm" disabled={exportando || carregando} onClick={exportarDados} icon={<Download size={15} strokeWidth={1.75} />}>
                {exportando ? 'Gerando…' : 'Exportar meus dados'}
              </Button>
              <Button variant="ghost" size="sm" className="conta-danger" onClick={() => setConfirmandoExclusao(true)} icon={<Trash2 size={15} strokeWidth={1.75} />}>
                Excluir conta
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
