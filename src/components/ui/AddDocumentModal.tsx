import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CircleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../integrations/supabase/client'
import { interpretarErro, textoDaFalha, type FalhaAoSalvar } from '../../lib/erros'
import { documentoSchema } from '../../lib/validacao'
import { bezelSpring } from '../../lib/motion'
import { Button, DocumentGlyph } from './Bezel'

const TIPOS = [
  { id: 'cnh', label: 'CNH', description: 'Carteira de motorista' },
  { id: 'crlv', label: 'CRLV', description: 'Documento do veículo' },
  { id: 'ipva', label: 'IPVA', description: 'Imposto do veículo' },
  { id: 'passaporte', label: 'Passaporte', description: 'Documento de viagem' },
  { id: 'rg', label: 'RG', description: 'Identidade' },
  { id: 'seguro', label: 'Seguro auto', description: 'Apólice do veículo' },
  { id: 'plano_saude', label: 'Plano de saúde', description: 'Plano médico' },
  { id: 'carteira_trabalho', label: 'Carteira de trabalho', description: 'CTPS' },
  { id: 'alvara', label: 'Alvará', description: 'Funcionamento da empresa', empresarial: true },
  { id: 'certidao', label: 'Certidão negativa', description: 'Receita, FGTS, trabalhista', empresarial: true },
  { id: 'das_mei', label: 'DAS-MEI', description: 'Guia mensal do MEI', empresarial: true },
  { id: 'outro', label: 'Outro', description: 'Outro documento' },
]

interface Props {
  dark: boolean
  onClose: () => void
  onSuccess: () => void
  // Chamado quando o banco recusa por limite do plano (trigger enforce_plan_limits):
  // o pai abre a assinatura em vez de mostrar texto.
  onLimite?: () => void
  // Tipos empresariais aparecem só para quem pode usá-los (plano MEI).
  mostrarEmpresariais?: boolean
}

export function AddDocumentModal(props: Props) {
  const { onClose, onSuccess, onLimite, mostrarEmpresariais = false } = props
  const tipos = TIPOS.filter(item => mostrarEmpresariais || !item.empresarial)
  const { user } = useAuth()
  const reduceMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(1)
  const [tipo, setTipo] = useState('')
  const [apelido, setApelido] = useState('')
  const [data, setData] = useState('')
  const [loading, setLoading] = useState(false)
  const [falha, setFalha] = useState<FalhaAoSalvar | null>(null)
  const selectedDocument = tipos.find(item => item.id === tipo)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusableSelector = 'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    const firstFocusable = dialog?.querySelector<HTMLElement>(focusableSelector)
    firstFocusable?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  const handleSalvar = async () => {
    if (!tipo || !data || !user) return
    setLoading(true)
    setFalha(null)

    const validado = documentoSchema.safeParse({ tipo, apelido, data_vencimento: data })
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
    })

    if (error) {
      const falhaAoSalvar = interpretarErro(error)
      setLoading(false)
      if (falhaAoSalvar?.tipo === 'limite_plano' && onLimite) { onLimite(); return }
      setFalha(falhaAoSalvar)
      return
    }

    setLoading(false)
    onSuccess()
  }

  return (
    <motion.div
      className="bz-modal-layer"
      initial={reduceMotion ? undefined : { opacity: 0 }}
      animate={reduceMotion ? undefined : { opacity: 1 }}
      transition={reduceMotion ? undefined : { duration: 0.22 }}
      onMouseDown={event => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        className="bz-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-document-title"
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? undefined : bezelSpring}
      >
        <header className="bz-modal__header">
          <div>
            <h2 id="add-document-title">Adicionar documento</h2>
            <p>ETAPA 0{step} / 02</p>
          </div>
          <button className="bz-icon-button bz-modal__close" type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        {step === 1 ? (
          <div className="bz-modal__body">
            <p className="bz-modal__lead">Qual documento você quer colocar sob vigilância?</p>
            <div className="document-picker" role="list" aria-label="Tipos de documento">
              {tipos.map(item => (
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
            <div className="bz-modal__actions">
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button variant="primary" disabled={!tipo} onClick={() => setStep(2)} icon={<ArrowRight size={16} strokeWidth={1.75} />}>
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="bz-modal__body">
            <p className="bz-modal__lead">{selectedDocument?.label} selecionado. Agora falta a data que move todo o sistema.</p>
            <div className="bz-field">
              <label htmlFor="modal-data">Data de vencimento</label>
              <input className="bz-input" id="modal-data" type="date" value={data} onChange={event => setData(event.target.value)} />
            </div>
            <div className="bz-field">
              <label htmlFor="modal-apelido">Apelido <span className="bz-field__optional">(opcional)</span></label>
              <input
                className="bz-input"
                id="modal-apelido"
                type="text"
                maxLength={80}
                value={apelido}
                onChange={event => setApelido(event.target.value)}
                placeholder={`Ex.: ${selectedDocument?.label} principal`}
              />
            </div>

            {falha && (
              <div className={`bz-feedback ${falha.tipo === 'limite_plano' ? 'bz-feedback--info' : 'bz-feedback--danger'}`} role="alert">
                <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" />
                <p>{textoDaFalha(falha)}</p>
              </div>
            )}

            <div className="bz-modal__actions">
              <Button variant="secondary" onClick={() => setStep(1)} icon={<ArrowLeft size={16} strokeWidth={1.75} />}>Voltar</Button>
              <Button variant="primary" disabled={!data || loading} onClick={handleSalvar}>
                {loading ? 'Salvando…' : 'Salvar documento'}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
