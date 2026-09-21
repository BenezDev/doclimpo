import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { supabase } from '../../integrations/supabase/client'
import { formatarData, hojeISO, somarAnos } from '../../lib/datas'
import { interpretarErro, textoDaFalha } from '../../lib/erros'
import { bezelSpring } from '../../lib/motion'
import { renovacaoSchema } from '../../lib/validacao'
import { Button } from './Bezel'

export interface DocumentoRenovavel {
  id: string
  tipo: string
  apelido: string | null
  data_vencimento: string
}

interface Props {
  documento: DocumentoRenovavel
  nome: string
  // Sugestão inicial da nova data (calendário veicular, CNH por idade…). Sem ela, +1 ano.
  sugestao?: string
  // Conteúdo extra abaixo do campo de data (calculadoras de prazo).
  ajuda?: ReactNode
  onClose: () => void
  onRenovado: (novoId: string) => void
  onEncerrado: () => void
}

// "Marcar como renovado" com continuidade: a linha antiga vira histórico e
// uma nova nasce com o próximo prazo (rpc renovar_documento, transacional).
// "Encerrar" mantém o comportamento antigo: só resolve, sem nova data.
export function RenovarDialog({ documento, nome, sugestao, ajuda, onClose, onRenovado, onEncerrado }: Props) {
  const reduceMotion = useReducedMotion()
  const [novaData, setNovaData] = useState(sugestao ?? somarAnos(documento.data_vencimento, 1))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const renovar = async () => {
    const validado = renovacaoSchema.safeParse({ nova_data: novaData })
    if (!validado.success) { setErro(validado.error.issues[0]?.message ?? 'Informe uma data válida.'); return }
    if (validado.data.nova_data < hojeISO()) { setErro('A nova data precisa ser hoje ou depois.'); return }
    setSalvando(true)
    setErro(null)
    const { data, error } = await supabase.rpc('renovar_documento', { p_id: documento.id, p_nova_data: validado.data.nova_data })
    setSalvando(false)
    if (error || typeof data !== 'string') {
      const falha = interpretarErro(error)
      setErro(falha ? textoDaFalha(falha) : 'Não foi possível renovar agora. Tente novamente.')
      return
    }
    onRenovado(data)
  }

  const encerrar = async () => {
    setSalvando(true)
    setErro(null)
    const { error } = await supabase.from('documentos').update({ resolvido: true }).eq('id', documento.id)
    setSalvando(false)
    if (error) { setErro('Não foi possível encerrar agora. Tente novamente.'); return }
    onEncerrado()
  }

  return (
    <div className="bz-modal-layer" onMouseDown={event => event.target === event.currentTarget && !salvando && onClose()}>
      <motion.div
        className="bz-modal bz-modal--compact"
        role="dialog"
        aria-modal="true"
        aria-labelledby="renovar-titulo"
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? undefined : bezelSpring}
      >
        <header className="bz-modal__header">
          <div>
            <h2 id="renovar-titulo">Renovou {nome}?</h2>
            <p>PRÓXIMO PRAZO</p>
          </div>
          <button className="bz-icon-button" type="button" onClick={onClose} aria-label="Fechar" disabled={salvando}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>
        <div className="bz-modal__body">
          <p className="renovar-dialog__texto">
            O prazo atual ({formatarData(documento.data_vencimento)}) vai para o histórico e os avisos de 90, 30, 7 e 1 dia recomeçam para a nova data.
          </p>
          <div className="bz-field">
            <label htmlFor="renovar-data">Nova data de vencimento</label>
            <input className="bz-input" id="renovar-data" type="date" value={novaData} min={hojeISO()} onChange={event => setNovaData(event.target.value)} />
          </div>
          {ajuda}
          {erro && (
            <div className="bz-feedback bz-feedback--danger" role="alert">
              <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" />
              <p>{erro}</p>
            </div>
          )}
          <div className="bz-modal__actions">
            <Button variant="ghost" disabled={salvando} onClick={encerrar}>Encerrar sem novo prazo</Button>
            <Button variant="primary" disabled={salvando} onClick={renovar} icon={<CheckCircle2 size={16} strokeWidth={1.75} />}>
              {salvando ? 'Salvando…' : 'Renovar com novo prazo'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
