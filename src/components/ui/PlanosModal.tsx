import { motion, useReducedMotion } from 'framer-motion'
import { Check, CircleAlert, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../integrations/supabase/client'
import { bezelSpring } from '../../lib/motion'
import { PLANOS, formatarPreco, urlStripeSegura, type PlanType, type PlanoSlug } from '../../lib/planos'
import { Button } from './Bezel'

interface Props {
  onClose: () => void
  // 'limite': o usuário bateu no limite do plano gratuito; 'escolha': abriu por vontade própria.
  motivo?: 'limite' | 'escolha'
  planoAtual?: PlanType
}

async function mensagemDaFuncao(error: unknown, padrao: string): Promise<string> {
  const contexto = (error as { context?: Response } | null)?.context
  if (!contexto) return padrao
  try {
    const corpo = await contexto.clone().json() as { error?: string }
    return typeof corpo.error === 'string' ? corpo.error : padrao
  } catch { return padrao }
}

export function PlanosModal({ onClose, motivo = 'escolha', planoAtual = 'FREE' }: Props) {
  const reduceMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [assinando, setAssinando] = useState<PlanoSlug | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusableSelector = 'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  const assinar = async (plano: PlanoSlug) => {
    setAssinando(plano)
    setErro(null)
    // O servidor resolve o preço a partir do plano; o navegador nunca envia valores.
    const { data, error } = await supabase.functions.invoke<{ url?: string }>('create-checkout', { body: { plano } })
    const destino = urlStripeSegura(data?.url)
    if (error || !destino) {
      setAssinando(null)
      setErro(await mensagemDaFuncao(error, 'Não foi possível iniciar o pagamento agora. Tente de novo em instantes.'))
      return
    }
    window.location.assign(destino)
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
        className="bz-modal bz-modal--planos"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="planos-modal-title"
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? undefined : bezelSpring}
      >
        <header className="bz-modal__header">
          <div>
            <h2 id="planos-modal-title">{motivo === 'limite' ? 'Seu plano gratuito monitora 1 documento.' : 'Escolha seu plano.'}</h2>
            <p>ASSINATURA MENSAL · CANCELE QUANDO QUISER</p>
          </div>
          <button className="bz-icon-button bz-modal__close" type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <div className="bz-modal__body">
          <p className="bz-modal__lead">
            {motivo === 'limite'
              ? 'Para acompanhar mais documentos, escolha um plano. O pagamento é feito no Stripe e a assinatura pode ser cancelada a qualquer momento.'
              : 'Todos os planos incluem documentos ilimitados, alertas por e-mail e notificações no navegador, além do guia de renovação.'}
          </p>

          <div className="planos-grid" role="list" aria-label="Planos disponíveis">
            {PLANOS.map(plano => {
              const atual = planoAtual === plano.id
              return (
                <article className={`plano-card ${plano.destaque ? 'plano-card--destaque' : ''}`} role="listitem" key={plano.id}>
                  {plano.destaque && <span className="plano-card__selo"><Sparkles size={12} strokeWidth={2} aria-hidden="true" /> Mais escolhido</span>}
                  <h3>{plano.nome}</h3>
                  <p className="plano-card__descricao">{plano.descricao}</p>
                  <div className="plano-card__preco"><strong className="bz-data">{formatarPreco(plano.precoCentavos)}</strong><span>/mês</span></div>
                  <ul className="plano-card__lista">
                    {plano.beneficios.map(item => <li key={item}><Check size={14} strokeWidth={2} aria-hidden="true" />{item}</li>)}
                  </ul>
                  <Button
                    variant={plano.destaque ? 'primary' : 'secondary'}
                    size="md"
                    disabled={assinando !== null || atual}
                    onClick={() => assinar(plano.slug)}
                  >
                    {atual ? 'Seu plano atual' : assinando === plano.slug ? 'Abrindo pagamento…' : `Assinar ${plano.nome}`}
                  </Button>
                </article>
              )
            })}
          </div>

          {erro && (
            <div className="bz-feedback bz-feedback--danger" role="alert">
              <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" />
              <p>{erro}</p>
            </div>
          )}

          <p className="planos-nota">
            Pagamento processado pelo Stripe; não guardamos dados do cartão. Você pode desistir em até 7 dias com devolução integral. Condições nos <Link to="/termos">termos de uso</Link>.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
