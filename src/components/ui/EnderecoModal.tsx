import { motion, useReducedMotion } from 'framer-motion'
import { CircleAlert, Loader2, MapPin, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../integrations/supabase/client'
import { buscarCep, formatarCep, normalizarCep } from '../../lib/cep'
import { resolverCoordenada, type PerfilEndereco } from '../../lib/endereco'
import { enderecoSchema } from '../../lib/validacao'
import { bezelSpring } from '../../lib/motion'
import { Button } from './Bezel'

interface Props {
  dark?: boolean
  inicial?: PerfilEndereco | null
  onClose: () => void
  onSaved: (endereco: PerfilEndereco) => void
}

export function EnderecoModal({ inicial, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const reduceMotion = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)

  const [cep, setCep] = useState(inicial?.cep ?? '')
  const [logradouro, setLogradouro] = useState(inicial?.logradouro ?? '')
  const [numero, setNumero] = useState(inicial?.numero ?? '')
  const [complemento, setComplemento] = useState(inicial?.complemento ?? '')
  const [bairro, setBairro] = useState(inicial?.bairro ?? '')
  const [cidade, setCidade] = useState(inicial?.cidade ?? '')
  const [uf, setUf] = useState(inicial?.uf ?? '')
  const [ibge, setIbge] = useState(inicial?.ibge ?? '')

  const [buscandoCep, setBuscandoCep] = useState(false)
  const [cepNaoEncontrado, setCepNaoEncontrado] = useState(false)
  const [salvando, setSalvando] = useState(false)
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

  const aoDigitarCep = async (valor: string) => {
    setCep(valor)
    setCepNaoEncontrado(false)
    const limpo = normalizarCep(valor)
    if (limpo.length !== 8) return

    setBuscandoCep(true)
    const resultado = await buscarCep(limpo)
    setBuscandoCep(false)
    if (!resultado) { setCepNaoEncontrado(true); return }

    setLogradouro(resultado.logradouro)
    setBairro(resultado.bairro)
    setCidade(resultado.cidade)
    setUf(resultado.uf)
    setIbge(resultado.ibge)
  }

  const podeSalvar = Boolean(cidade && uf) && !salvando

  const salvar = async () => {
    if (!user || !podeSalvar) return
    setSalvando(true)
    setErro(null)

    const validado = enderecoSchema.safeParse({ cep: normalizarCep(cep), logradouro, numero, complemento, bairro, cidade, uf })
    if (!validado.success) {
      setSalvando(false)
      setErro(validado.error.issues[0]?.message ?? 'Confira os campos do endereço.')
      return
    }

    const coord = resolverCoordenada({ ibge, cidade, uf })
    const endereco: PerfilEndereco = {
      cep: normalizarCep(cep) || null,
      logradouro: logradouro || null,
      numero: numero || null,
      complemento: complemento || null,
      bairro: bairro || null,
      cidade: cidade || null,
      uf: uf ? uf.toUpperCase() : null,
      ibge: ibge || null,
      latitude: coord?.lat ?? null,
      longitude: coord?.lng ?? null,
    }

    const { error } = await supabase
      .from('profiles')
      .update({ ...endereco, endereco_atualizado_em: new Date().toISOString() })
      .eq('user_id', user.id)

    setSalvando(false)
    if (error) { setErro('Não foi possível salvar agora. Tente novamente em instantes.'); return }
    onSaved(endereco)
  }

  return (
    <motion.div
      className="bz-modal-layer"
      initial={reduceMotion ? undefined : { opacity: 0 }}
      animate={reduceMotion ? undefined : { opacity: 1 }}
      transition={reduceMotion ? undefined : { duration: 0.22 }}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.div
        className="bz-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="endereco-modal-title"
        initial={reduceMotion ? undefined : { opacity: 0, scale: 0.96, y: 8 }}
        animate={reduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
        transition={reduceMotion ? undefined : bezelSpring}
      >
        <header className="bz-modal__header">
          <div>
            <h2 id="endereco-modal-title">Onde você mora?</h2>
            <p>LOCAIS DE RENOVAÇÃO PERTO DE VOCÊ</p>
          </div>
          <button className="bz-icon-button bz-modal__close" type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <div className="bz-modal__body">
          <p className="bz-modal__lead">
            Com seu endereço, mostramos a unidade mais próxima para renovar cada documento. É opcional e fica só na sua conta.
          </p>

          <div className="bz-field">
            <label htmlFor="endereco-cep">CEP</label>
            <div className="endereco-cep">
              <input
                className="bz-input"
                id="endereco-cep"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={9}
                placeholder="00000-000"
                value={formatarCep(cep)}
                onChange={(event) => aoDigitarCep(event.target.value)}
              />
              {buscandoCep && <Loader2 className="endereco-cep__spin" size={18} strokeWidth={1.75} aria-label="Buscando CEP" />}
            </div>
            {cepNaoEncontrado && <p className="bz-field__help">Não encontramos esse CEP. Você pode preencher os campos manualmente.</p>}
          </div>

          <div className="bz-field">
            <label htmlFor="endereco-rua">Rua / logradouro</label>
            <input className="bz-input" id="endereco-rua" maxLength={120} value={logradouro} onChange={(e) => setLogradouro(e.target.value)} />
          </div>

          <div className="endereco-linha">
            <div className="bz-field">
              <label htmlFor="endereco-numero">Número</label>
              <input className="bz-input" id="endereco-numero" maxLength={20} value={numero} onChange={(e) => setNumero(e.target.value)} />
            </div>
            <div className="bz-field">
              <label htmlFor="endereco-complemento">Complemento <span className="bz-field__optional">(opcional)</span></label>
              <input className="bz-input" id="endereco-complemento" maxLength={60} value={complemento} onChange={(e) => setComplemento(e.target.value)} />
            </div>
          </div>

          <div className="bz-field">
            <label htmlFor="endereco-bairro">Bairro</label>
            <input className="bz-input" id="endereco-bairro" maxLength={80} value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </div>

          <div className="endereco-linha endereco-linha--cidade">
            <div className="bz-field">
              <label htmlFor="endereco-cidade">Cidade</label>
              <input className="bz-input" id="endereco-cidade" maxLength={80} value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
            <div className="bz-field">
              <label htmlFor="endereco-uf">UF</label>
              <input className="bz-input" id="endereco-uf" maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} />
            </div>
          </div>

          {erro && (
            <div className="bz-feedback bz-feedback--danger" role="alert">
              <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" />
              <p>{erro}</p>
            </div>
          )}

          <p className="endereco-privacidade">
            <MapPin size={13} strokeWidth={1.75} aria-hidden="true" />
            Usamos seu endereço só para indicar locais de renovação. Só o CEP é consultado no ViaCEP. Veja a <Link to="/privacidade">política de privacidade</Link>.
          </p>

          <div className="bz-modal__actions">
            <Button type="button" variant="ghost" onClick={onClose}>Pular por agora</Button>
            <Button type="button" variant="primary" disabled={!podeSalvar} onClick={salvar}>
              {salvando ? 'Salvando…' : 'Salvar endereço'}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
