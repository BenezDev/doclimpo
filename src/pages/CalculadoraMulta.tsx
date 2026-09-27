import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionLink } from '../components/ui/ActionLink'
import { StatusPill } from '../components/ui/Bezel'
import { PublicShell } from '../components/ui/PublicShell'
import { dataValida, diasRestantes, formatarData, hojeISO, statusPorDias } from '../lib/datas'
import { calculadoraPorPath } from '../lib/guias'
import { sugerirPrazoMulta } from '../lib/multas'

const calculadora = calculadoraPorPath('/calculadora/prazo-multa')!

type Carta = 'autuacao' | 'penalidade'

const CARTAS: Record<Carta, { rotulo: string; detalhe: string; campo: string }> = {
  autuacao: { rotulo: 'Notificação da autuação', detalhe: 'A primeira carta, que avisa da infração, ainda sem valor para pagar.', campo: 'Data de expedição impressa na carta' },
  penalidade: { rotulo: 'Notificação da penalidade', detalhe: 'A segunda carta, com o valor da multa e a data de vencimento.', campo: 'Data da notificação impressa na carta' },
}

function textoDias(dias: number) {
  if (dias < 0) return `terminou há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
  if (dias === 0) return 'termina hoje'
  return `faltam ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

// Calculadora pública dos prazos mínimos da multa (CTB, arts. 257, 281-A,
// 282 e 284), com a mesma regra do cadastro de multas (lib/multas.ts).
export default function CalculadoraMulta() {
  const [carta, setCarta] = useState<Carta>('autuacao')
  const [data, setData] = useState('')

  const prazo = dataValida(data) ? sugerirPrazoMulta(carta === 'autuacao' ? 'defesa' : 'recurso', data) : null
  const dias = prazo ? diasRestantes(prazo.data) : null

  return (
    <PublicShell>
      <header className="privacy-heading">
        <span className="bz-micro">Calculadora · <Link to="/guias">Guias e calculadoras</Link></span>
        <h1>Qual o prazo da minha multa?</h1>
        <p>Escolha qual carta chegou e informe a data impressa nela. Você vê o prazo mínimo que o Código de Trânsito garante para se defender, indicar o condutor ou recorrer.</p>
      </header>

      <section className="calculadora" aria-labelledby="calculadora-titulo">
        <h2 className="bz-sr-only" id="calculadora-titulo">Calcular o prazo</h2>
        <fieldset className="calculadora__opcoes">
          <legend>Qual carta você recebeu?</legend>
          {(Object.keys(CARTAS) as Carta[]).map(opcao => (
            <label className="calculadora__opcao" key={opcao}>
              <input type="radio" name="carta" value={opcao} checked={carta === opcao} onChange={() => setCarta(opcao)} />
              <span><strong>{CARTAS[opcao].rotulo}</strong><small>{CARTAS[opcao].detalhe}</small></span>
            </label>
          ))}
        </fieldset>
        <div className="calculadora__campos calculadora__campos--um">
          <div className="bz-field">
            <label htmlFor="multa-data">{CARTAS[carta].campo}</label>
            <input className="bz-input" id="multa-data" type="date" value={data} max={hojeISO()} onChange={event => setData(event.target.value)} />
          </div>
        </div>

        <div className="calculadora__resultado" aria-live="polite">
          {!prazo && <p className="calculadora__dica">Informe a data impressa na carta para ver o prazo.</p>}
          {prazo && dias !== null && (
            <>
              <span className="bz-micro">{carta === 'autuacao' ? 'Defesa prévia e indicação do condutor até' : 'Recurso e pagamento com desconto até'}</span>
              <strong className="calculadora__data">{formatarData(prazo.data)}</strong>
              <div className="calculadora__linha">
                <StatusPill status={statusPorDias(dias).id} label={textoDias(dias)} />
                <span>{prazo.dias} dias depois de {formatarData(data)} ({carta === 'autuacao' ? 'CTB, art. 281-A e art. 257, § 7º' : 'CTB, art. 282, §§ 4º e 5º'}).</span>
              </div>
              {carta === 'penalidade' && <p className="calculadora__nota">Até o vencimento, a multa sai por 80% do valor; pelo SNE, por 60%, se você abrir mão da defesa e do recurso (art. 284).</p>}
              <p className="calculadora__nota">Esse é o mínimo da lei. Se a carta trouxer uma data maior, vale a impressa.</p>
              <ActionLink to="/cadastro?documento=multa" variant="primary" size="lg">Receber aviso antes do prazo acabar<ArrowRight size={17} aria-hidden="true" /></ActionLink>
            </>
          )}
        </div>
        <p className="calculadora__privacidade"><ShieldCheck size={15} aria-hidden="true" />A conta é feita no seu navegador. Nada do que você digita aqui é enviado.</p>
      </section>

      <article className="privacy-body info-body calculadora__texto">
        <section id="como-funciona">
          <h2>Como a conta é feita</h2>
          <p>A multa chega em duas cartas. A notificação da autuação abre o prazo da defesa prévia, de pelo menos 30 dias contados da expedição (CTB, art. 281-A), e o de indicação do condutor, de 30 dias (art. 257, § 7º).</p>
          <p>A notificação da penalidade traz o prazo para recorrer, de pelo menos 30 dias, e essa mesma data é o vencimento do pagamento (art. 282, §§ 4º e 5º).</p>
        </section>
        <section id="perguntas">
          <h2>Perguntas</h2>
          <dl>
            {calculadora.faqs.map(item => <div key={item.pergunta}><dt>{item.pergunta}</dt><dd>{item.resposta}</dd></div>)}
          </dl>
        </section>
        <p><Link className="landing-row__link" to="/guias/prazos-da-multa">Guia completo dos prazos da multa<ArrowUpRight size={16} aria-hidden="true" /></Link></p>
      </article>
    </PublicShell>
  )
}
