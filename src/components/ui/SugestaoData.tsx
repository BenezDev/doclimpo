import { CalendarCheck, ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { FINAIS_PLACA, UFS, ehUf, finalDaPlaca, sugerirDataVeicular, ufsDisponiveis, type TipoVeicular } from '../../lib/calendario-veicular'
import { validadeCnh } from '../../lib/cnh'
import { dataValida, formatarData, hojeISO } from '../../lib/datas'
import { PRAZOS_MULTA, REGRAS_PRAZO, ehPrazoMulta, sugerirPrazoMulta, type PrazoMulta } from '../../lib/multas'
import type { Veiculo } from '../../lib/veiculos'
import { Button } from './Bezel'

export interface ExtraVeicular { uf: string; placa_final: string }

type VeiculoRef = Pick<Veiculo, 'uf' | 'placa'> | null | undefined

interface Props {
  tipo: string
  ufPadrao?: string | null
  ano?: number
  // Veículo do painel do carro: pré-preenche UF e final da placa.
  veiculo?: VeiculoRef
  onEscolher: (data: string, extra?: ExtraVeicular) => void
}

// Sugere a data de vencimento a partir do que o usuário costuma saber: idade e
// data do exame (CNH), UF + final da placa (IPVA e licenciamento) ou data da
// notificação (multa). Nada disto é gravado além de { uf, placa_final }; a data
// vai para o campo e o usuário continua livre para ajustar.
export function SugestaoData({ tipo, ufPadrao, ano = new Date().getFullYear(), veiculo, onEscolher }: Props) {
  if (tipo === 'cnh') return <SugestaoCnh onEscolher={onEscolher} />
  if (tipo === 'ipva' || tipo === 'crlv') return <SugestaoVeicular tipo={tipo} ufPadrao={ufPadrao} ano={ano} veiculo={veiculo} onEscolher={onEscolher} />
  if (tipo === 'multa') return <SugestaoMulta veiculo={veiculo} onEscolher={onEscolher} />
  return null
}

// { uf, placa_final } do veículo, quando a placa termina em dígito (sempre, nas
// placas válidas) — é o que o detalhe e a renovação usam.
function extraDoVeiculo(veiculo: VeiculoRef): ExtraVeicular | undefined {
  const placaFinal = veiculo ? finalDaPlaca(veiculo.placa) : null
  return veiculo && placaFinal ? { uf: veiculo.uf, placa_final: placaFinal } : undefined
}

function SugestaoCnh({ onEscolher }: { onEscolher: Props['onEscolher'] }) {
  const [nascimento, setNascimento] = useState('')
  const [exame, setExame] = useState(hojeISO())
  const pronto = dataValida(nascimento) && dataValida(exame) && nascimento < exame
  const resultado = pronto ? validadeCnh(nascimento, exame) : null

  return (
    <div className="sugestao">
      <span className="bz-micro">Calcular pela idade</span>
      <p className="sugestao__texto">A validade da CNH depende da idade no exame: 10 anos até 49, 5 anos de 50 a 69, 3 anos a partir de 70 (Lei 14.071/2020).</p>
      <div className="sugestao__campos">
        <div className="bz-field">
          <label htmlFor="sugestao-nascimento">Nascimento</label>
          <input className="bz-input" id="sugestao-nascimento" type="date" value={nascimento} max={hojeISO()} onChange={event => setNascimento(event.target.value)} />
        </div>
        <div className="bz-field">
          <label htmlFor="sugestao-exame">Data do exame</label>
          <input className="bz-input" id="sugestao-exame" type="date" value={exame} onChange={event => setExame(event.target.value)} />
        </div>
      </div>
      {resultado && (
        <div className="sugestao__resultado">
          <span>Validade sugerida: <strong>{formatarData(resultado.validade)}</strong> ({resultado.anos} anos; {resultado.idade} anos no exame)</span>
          <Button variant="secondary" size="sm" onClick={() => onEscolher(resultado.validade)} icon={<CalendarCheck size={15} strokeWidth={1.75} />}>Usar esta data</Button>
        </div>
      )}
      <small className="sugestao__nota">A data de nascimento não é salva. Confira a validade impressa na CNH.</small>
    </div>
  )
}

function SugestaoVeicular({ tipo, ufPadrao, ano, veiculo, onEscolher }: { tipo: TipoVeicular; ufPadrao?: string | null; ano: number; veiculo?: VeiculoRef; onEscolher: Props['onEscolher'] }) {
  const doVeiculo = extraDoVeiculo(veiculo)
  const [uf, setUf] = useState(doVeiculo?.uf ?? (ehUf(ufPadrao) ? ufPadrao : ''))
  const [placaFinal, setPlacaFinal] = useState(doVeiculo?.placa_final ?? '')
  const disponiveis = ufsDisponiveis(tipo, ano)
  const sugestao = uf && placaFinal ? sugerirDataVeicular({ tipo, uf, placaFinal, ano }) : null
  const rotulo = tipo === 'ipva' ? 'cota única do IPVA' : 'licenciamento'

  return (
    <div className="sugestao">
      <span className="bz-micro">Sugerir pelo calendário {ano}</span>
      <div className="sugestao__campos">
        <div className="bz-field">
          <label htmlFor="sugestao-uf">UF do veículo</label>
          <select className="bz-input" id="sugestao-uf" value={uf} onChange={event => setUf(event.target.value)}>
            <option value="">Selecione</option>
            {UFS.map(item => <option key={item} value={item}>{item}{disponiveis.includes(item) ? '' : ' (sem calendário)'}</option>)}
          </select>
        </div>
        <div className="bz-field">
          <label htmlFor="sugestao-final">Final da placa</label>
          <select className="bz-input" id="sugestao-final" value={placaFinal} onChange={event => setPlacaFinal(event.target.value)}>
            <option value="">Selecione</option>
            {FINAIS_PLACA.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>
      {sugestao && (
        <div className="sugestao__resultado">
          <span>
            Prazo do {rotulo} em {uf}: <strong>{formatarData(sugestao.data)}</strong>
            {' '}<a className="sugestao__fonte" href={sugestao.fonte} target="_blank" rel="noopener noreferrer">fonte oficial<ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" /></a>
            {' '}(consultada em {formatarData(sugestao.verificadoEm)})
          </span>
          <Button variant="secondary" size="sm" onClick={() => onEscolher(sugestao.data, { uf, placa_final: placaFinal })} icon={<CalendarCheck size={15} strokeWidth={1.75} />}>Usar esta data</Button>
        </div>
      )}
      {uf && placaFinal && !sugestao && (
        <p className="sugestao__texto">Calendário {ano} de {uf} para {rotulo} não disponível aqui. Confira na Sefaz ou no Detran do estado e digite a data.</p>
      )}
      <small className="sugestao__nota">{sugestao?.observacao ?? 'Calendários mudam todo ano; confira na Sefaz/Detran antes de contar com a data.'}</small>
    </div>
  )
}

// Prazos legais da multa (CTB): defesa prévia e indicação do condutor contam
// da notificação da autuação; recurso, da notificação da penalidade — ambos
// no mínimo 30 dias. O vencimento com desconto vem impresso, sem cálculo.
function SugestaoMulta({ veiculo, onEscolher }: { veiculo?: VeiculoRef; onEscolher: Props['onEscolher'] }) {
  const [prazo, setPrazo] = useState<PrazoMulta>('defesa')
  const [notificacao, setNotificacao] = useState('')
  const regra = REGRAS_PRAZO[prazo]
  const sugestao = notificacao ? sugerirPrazoMulta(prazo, notificacao) : null

  return (
    <div className="sugestao">
      <span className="bz-micro">Calcular pelo prazo legal</span>
      <div className="sugestao__campos">
        <div className="bz-field">
          <label htmlFor="sugestao-prazo">Qual prazo</label>
          <select className="bz-input" id="sugestao-prazo" value={prazo} onChange={event => { if (ehPrazoMulta(event.target.value)) setPrazo(event.target.value) }}>
            {PRAZOS_MULTA.map(item => <option key={item} value={item}>{REGRAS_PRAZO[item].rotulo}</option>)}
          </select>
        </div>
        <div className="bz-field">
          <label htmlFor="sugestao-notificacao">Data da notificação</label>
          <input className="bz-input" id="sugestao-notificacao" type="date" value={notificacao} max={hojeISO()} disabled={regra.dias === null} onChange={event => setNotificacao(event.target.value)} />
        </div>
      </div>
      <p className="sugestao__texto">{regra.descricao}</p>
      {sugestao && (
        <div className="sugestao__resultado">
          <span>Prazo mínimo: <strong>{formatarData(sugestao.data)}</strong> ({sugestao.dias} dias após {formatarData(notificacao)}; {sugestao.base})</span>
          <Button variant="secondary" size="sm" onClick={() => onEscolher(sugestao.data, extraDoVeiculo(veiculo))} icon={<CalendarCheck size={15} strokeWidth={1.75} />}>Usar esta data</Button>
        </div>
      )}
      {regra.dias === null && (
        <p className="sugestao__texto">Digite no campo acima a data de vencimento impressa na notificação da penalidade. Até ela, o pagamento tem 20% de desconto; pelo SNE, 40%, se você não apresentar defesa nem recurso (CTB, art. 284).</p>
      )}
      <small className="sugestao__nota">Se a notificação trouxer prazo maior que o mínimo, use o impresso: ele é o que vale. O DocLimpo não consulta multas.</small>
    </div>
  )
}
