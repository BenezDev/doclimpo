import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BellRing, CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Brand, Button, DocumentGlyph, SuccessMark, ThemeToggle } from '../components/ui/Bezel'
import { EnderecoModal } from '../components/ui/EnderecoModal'
import { PlanosModal } from '../components/ui/PlanosModal'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../integrations/supabase/client'
import { interpretarErro, textoDaFalha, type FalhaAoSalvar } from '../lib/erros'
import { documentoSchema } from '../lib/validacao'
import { documentIntent } from '../lib/public-content'
import { SugestaoData, type ExtraVeicular } from '../components/ui/SugestaoData'

const TIPOS = [
  { id: 'cnh', label: 'CNH', description: 'Carteira de motorista' },
  { id: 'crlv', label: 'CRLV', description: 'Documento do veículo' },
  { id: 'ipva', label: 'IPVA', description: 'Imposto do veículo' },
  { id: 'multa', label: 'Multa de trânsito', description: 'Defesa, desconto ou recurso' },
  { id: 'passaporte', label: 'Passaporte', description: 'Documento de viagem' },
  { id: 'rg', label: 'RG', description: 'Identidade' },
  { id: 'seguro', label: 'Seguro auto', description: 'Apólice do veículo' },
  { id: 'plano_saude', label: 'Plano de saúde', description: 'Plano médico' },
  { id: 'carteira_trabalho', label: 'Carteira de trabalho', description: 'CTPS' },
  { id: 'garantia', label: 'Garantia', description: 'Produto ou serviço' },
  { id: 'contrato', label: 'Contrato', description: 'Aluguel ou prestação' },
  { id: 'exame', label: 'Exame periódico', description: 'ASO ou atestado' },
  { id: 'outro', label: 'Outro', description: 'Outro documento' },
]

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { search } = useLocation()
  const reduceMotion = useReducedMotion()
  const { dark, toggleTheme } = useTheme()
  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState(() => documentIntent(search))
  const [apelido, setApelido] = useState('')
  const [data, setData] = useState('')
  const [extra, setExtra] = useState<ExtraVeicular | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [falha, setFalha] = useState<FalhaAoSalvar | null>(null)
  const [mostrarEndereco, setMostrarEndereco] = useState(false)
  const [mostrarPlanos, setMostrarPlanos] = useState(false)

  const nome = user?.user_metadata?.nome || 'usuário'
  const selectedDocument = TIPOS.find(item => item.id === tipo)
  const stepMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
      }

  const handleSalvar = async () => {
    if (!tipo || !data || !user) return
    setLoading(true)
    setFalha(null)

    const validado = documentoSchema.safeParse({ tipo, apelido, data_vencimento: data, extra })
    if (!validado.success) {
      setFalha({ tipo: 'generico', mensagem: validado.error.issues[0]?.message ?? 'Dados inválidos.' })
      setLoading(false)
      return
    }

    const { error } = await supabase.from('documentos').insert({
      usuario_id: user.id,
      tipo,
      apelido: apelido || null,
      data_vencimento: data,
      extra: validado.data.extra ?? null,
    })

    if (error) {
      const falhaAoSalvar = interpretarErro(error)
      setLoading(false)
      // Já tem um documento (limite do gratuito): abre a assinatura na hora.
      if (falhaAoSalvar?.tipo === 'limite_plano') { setMostrarPlanos(true); return }
      setFalha(falhaAoSalvar)
      return
    }

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('user_id', user.id)

    setLoading(false)
    setStep(3)
    setMostrarEndereco(true)
  }

  return (
    <div className="bz-page onboarding-page">
      {mostrarEndereco && (
        <EnderecoModal onClose={() => setMostrarEndereco(false)} onSaved={() => setMostrarEndereco(false)} />
      )}

      {mostrarPlanos && (
        <PlanosModal motivo="limite" onClose={() => { setMostrarPlanos(false); navigate('/dashboard') }} />
      )}

      <header className="onboarding-topbar">
        <div className="bz-container onboarding-topbar__inner">
          <Brand />
          <div className="onboarding-progress" aria-label={`Etapa ${step} de 3`}>
            {[1, 2, 3].map(item => <span className={item <= step ? 'is-active' : ''} key={item} />)}
          </div>
          <ThemeToggle dark={dark} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="onboarding-main">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section className="onboarding-content" key="tipo" {...stepMotion}>
              <div className="onboarding-header">
                <span className="bz-micro">Etapa 01 · Documento</span>
                <h1>Olá, {nome}. O que não pode vencer?</h1>
                <p>Escolha o primeiro documento para monitorar. Você poderá adicionar os outros depois.</p>
              </div>

              <div className="document-picker" role="list" aria-label="Tipos de documento">
                {TIPOS.map(item => (
                  <button
                    className={`document-option ${tipo === item.id ? 'is-selected' : ''}`}
                    key={item.id}
                    onClick={() => setTipo(item.id)}
                    type="button"
                    aria-pressed={tipo === item.id}
                  >
                    <DocumentGlyph type={item.id} size="sm" />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div className="onboarding-actions">
                <Button variant="primary" size="lg" disabled={!tipo} onClick={() => setStep(2)} icon={<ArrowRight size={17} strokeWidth={1.75} />}>
                  Continuar
                </Button>
              </div>
              <button className="onboarding-skip" type="button" onClick={() => navigate('/dashboard')}>Pular por agora</button>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section className="onboarding-content" key="dados" {...stepMotion}>
              <div className="onboarding-header">
                <span className="bz-micro">Etapa 02 · Vencimento</span>
                <h1>Quando vence seu {selectedDocument?.label}?</h1>
                <p>Essa é a única data que o sistema precisa para começar a trabalhar.</p>
              </div>

              <div className="onboarding-form-card">
                <div className="bz-field">
                  <label htmlFor="onboarding-data">Data de vencimento</label>
                  <input
                    className="bz-input"
                    id="onboarding-data"
                    type="date"
                    value={data}
                    onChange={event => { setData(event.target.value); setExtra(undefined) }}
                  />
                </div>
                <SugestaoData tipo={tipo} onEscolher={(sugerida, dados) => { setData(sugerida); setExtra(dados) }} />
                <div className="bz-field">
                  <label htmlFor="onboarding-apelido">Apelido <span className="bz-field__optional">(opcional)</span></label>
                  <input
                    className="bz-input"
                    id="onboarding-apelido"
                    type="text"
                    maxLength={80}
                    value={apelido}
                    onChange={event => setApelido(event.target.value)}
                    placeholder={`Ex.: ${selectedDocument?.label} principal`}
                  />
                  <p className="bz-field__help">Use algo que você reconheça rápido no painel.</p>
                </div>
              </div>

              {data && (
                <div className="bz-feedback bz-feedback--info onboarding-notice">
                  <BellRing size={17} strokeWidth={1.75} aria-hidden="true" />
                  <p>Alertas programados para <strong className="bz-data">90 · 30 · 7 · 1</strong> dia antes do vencimento.</p>
                </div>
              )}

              {falha && (
                <div className={`bz-feedback ${falha.tipo === 'limite_plano' ? 'bz-feedback--info' : 'bz-feedback--danger'}`} role="alert">
                  <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" />
                  <div>
                    <p>{textoDaFalha(falha)}</p>
                    {falha.tipo === 'limite_plano' && (
                      <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>Ver meus documentos</Button>
                    )}
                  </div>
                </div>
              )}

              <div className="onboarding-actions">
                <Button variant="secondary" size="lg" onClick={() => setStep(1)} icon={<ArrowLeft size={17} strokeWidth={1.75} />}>Voltar</Button>
                <Button variant="primary" size="lg" disabled={!data || loading} onClick={handleSalvar}>
                  {loading ? 'Salvando…' : 'Proteger documento'}
                </Button>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section className="onboarding-content onboarding-success" key="sucesso" {...stepMotion}>
              <SuccessMark />
              <h1>Documento monitorado.</h1>
              <p>Seu {selectedDocument?.label} entrou no painel. A partir daqui, a data deixa de depender da sua memória.</p>
              <div className="bz-feedback bz-feedback--success">
                <BellRing size={17} strokeWidth={1.75} aria-hidden="true" />
                <p>Alertas configurados: <strong className="bz-data">90 · 30 · 7 · 1</strong> dia antes.</p>
              </div>
              <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')} icon={<ArrowRight size={17} strokeWidth={1.75} />}>
                Abrir meu painel
              </Button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
