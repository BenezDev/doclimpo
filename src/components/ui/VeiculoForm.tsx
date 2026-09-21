import { CircleAlert, Plus } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../integrations/supabase/client'
import { UFS, ehUf } from '../../lib/calendario-veicular'
import { interpretarErro, textoDaFalha } from '../../lib/erros'
import { veiculoSchema } from '../../lib/validacao'
import type { Veiculo } from '../../lib/veiculos'
import { Button } from './Bezel'

interface Props {
  ufPadrao?: string | null
  onSalvo: (veiculo: Veiculo) => void
  // Card do painel: só placa e UF, sem apelido.
  compacto?: boolean
}

// Cadastro de veículo (placa + UF + apelido). CRUD direto pelo RLS, como o
// endereço: a placa fica só na tabela veiculos e nunca vai para URL nem para
// terceiros. O banco repete a validação (CHECK + trigger de limite).
export function VeiculoForm({ ufPadrao, onSalvo, compacto = false }: Props) {
  const { user } = useAuth()
  const [placa, setPlaca] = useState('')
  const [uf, setUf] = useState(ehUf(ufPadrao) ? ufPadrao : '')
  const [apelido, setApelido] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const sufixo = compacto ? '-compacto' : ''

  const salvar = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user) return
    const validado = veiculoSchema.safeParse({ placa, uf, apelido })
    if (!validado.success) { setErro(validado.error.issues[0]?.message ?? 'Dados inválidos.'); return }
    setOcupado(true)
    setErro(null)
    const { data, error } = await supabase
      .from('veiculos')
      .insert({ usuario_id: user.id, placa: validado.data.placa, uf: validado.data.uf, apelido: validado.data.apelido || null })
      .select('id, placa, uf, apelido')
      .single()
    setOcupado(false)
    if (error || !data) {
      const falha = interpretarErro(error)
      setErro(falha?.tipo === 'duplicado' ? 'Essa placa já está cadastrada.' : falha ? textoDaFalha(falha) : 'Não foi possível salvar agora.')
      return
    }
    setPlaca('')
    setApelido('')
    onSalvo(data)
  }

  return (
    <form className={`veiculo-form${compacto ? ' veiculo-form--compacto' : ''}`} onSubmit={salvar}>
      <div className="veiculo-form__linha">
        <div className="bz-field">
          <label htmlFor={`veiculo-placa${sufixo}`}>Placa</label>
          <input
            className="bz-input"
            id={`veiculo-placa${sufixo}`}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={8}
            required
            value={placa}
            onChange={event => setPlaca(event.target.value.toUpperCase())}
            placeholder="ABC1D23"
          />
        </div>
        <div className="bz-field">
          <label htmlFor={`veiculo-uf${sufixo}`}>UF</label>
          <select className="bz-input" id={`veiculo-uf${sufixo}`} required value={uf} onChange={event => setUf(event.target.value)}>
            <option value="">UF</option>
            {UFS.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        {compacto && (
          <Button type="submit" variant="primary" size="sm" disabled={ocupado} icon={<Plus size={15} strokeWidth={1.75} />}>
            {ocupado ? 'Salvando…' : 'Cadastrar'}
          </Button>
        )}
      </div>
      {!compacto && (
        <>
          <div className="bz-field">
            <label htmlFor="veiculo-apelido">Apelido <span className="bz-field__optional">(opcional)</span></label>
            <input className="bz-input" id="veiculo-apelido" type="text" maxLength={60} value={apelido} onChange={event => setApelido(event.target.value)} placeholder="Ex.: carro da família" />
          </div>
          <div className="conta-actions">
            <Button type="submit" variant="secondary" size="sm" disabled={ocupado} icon={<Plus size={15} strokeWidth={1.75} />}>
              {ocupado ? 'Salvando…' : 'Cadastrar veículo'}
            </Button>
          </div>
        </>
      )}
      {erro && (
        <div className="bz-feedback bz-feedback--danger" role="alert">
          <CircleAlert size={17} strokeWidth={1.75} aria-hidden="true" />
          <p>{erro}</p>
        </div>
      )}
      <small className="veiculo-form__nota">A placa fica só na sua conta: serve para os links de consulta e para sugerir prazos de IPVA, licenciamento e multa. Não escreva Renavam nem CPF no apelido.</small>
    </form>
  )
}
