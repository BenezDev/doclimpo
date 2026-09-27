import { ArrowRight, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ActionLink } from '../components/ui/ActionLink'
import { StatusPill } from '../components/ui/Bezel'
import { PublicShell } from '../components/ui/PublicShell'
import { regraAtualVale, validadeCnh } from '../lib/cnh'
import { dataValida, diasRestantes, formatarData, hojeISO, statusPorDias } from '../lib/datas'
import { calculadoraPorPath } from '../lib/guias'

const calculadora = calculadoraPorPath('/calculadora/validade-cnh')!

function textoDias(dias: number) {
  if (dias < 0) return `venceu há ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'dia' : 'dias'}`
  if (dias === 0) return 'vence hoje'
  return `faltam ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

// Calculadora pública de validade da CNH (CTB, art. 147, § 2º). A conta roda
// no navegador com lib/cnh.ts; nada do que a pessoa digita sai da página.
export default function CalculadoraCnh() {
  const [nascimento, setNascimento] = useState('')
  const [exame, setExame] = useState(hojeISO())

  const datasOk = dataValida(nascimento) && dataValida(exame)
  const ordemOk = datasOk && nascimento < exame
  const resultado = ordemOk && regraAtualVale(exame) ? validadeCnh(nascimento, exame) : null
  const dias = resultado ? diasRestantes(resultado.validade) : null

  return (
    <PublicShell>
      <header className="privacy-heading">
        <span className="bz-micro">Calculadora · <Link to="/guias">Guias e calculadoras</Link></span>
        <h1>Até quando vale a minha CNH?</h1>
        <p>A validade depende da sua idade no dia do exame médico. Informe as duas datas e veja o vencimento, pelas regras do Código de Trânsito.</p>
      </header>

      <section className="calculadora" aria-labelledby="calculadora-titulo">
        <h2 className="bz-sr-only" id="calculadora-titulo">Calcular a validade</h2>
        <div className="calculadora__campos">
          <div className="bz-field">
            <label htmlFor="cnh-nascimento">Data de nascimento</label>
            <input className="bz-input" id="cnh-nascimento" type="date" value={nascimento} max={hojeISO()} onChange={event => setNascimento(event.target.value)} />
          </div>
          <div className="bz-field">
            <label htmlFor="cnh-exame">Data do exame médico</label>
            <input className="bz-input" id="cnh-exame" type="date" value={exame} onChange={event => setExame(event.target.value)} />
          </div>
        </div>

        <div className="calculadora__resultado" aria-live="polite">
          {!datasOk && <p className="calculadora__dica">Informe a data de nascimento. Se você vai renovar agora, deixe a data do exame como hoje.</p>}
          {datasOk && !ordemOk && <p className="calculadora__dica">A data do exame precisa ser depois da data de nascimento.</p>}
          {ordemOk && !regraAtualVale(exame) && (
            <p className="calculadora__dica">Para exames feitos antes de 12/04/2021 valiam outros prazos: 5 anos, ou 3 para quem tinha mais de 65. Nesse caso, vale a data impressa na sua CNH.</p>
          )}
          {resultado && dias !== null && (
            <>
              <span className="bz-micro">Sua CNH vale até</span>
              <strong className="calculadora__data">{formatarData(resultado.validade)}</strong>
              <div className="calculadora__linha">
                <StatusPill status={statusPorDias(dias).id} label={textoDias(dias)} />
                <span>{resultado.anos} anos, porque você tinha {resultado.idade} anos no exame.</span>
              </div>
              {dias < 0 && dias >= -30 && <p className="calculadora__alerta">Você está nos 30 dias de tolerância: dá para dirigir, mas renove logo.</p>}
              {dias < -30 && <p className="calculadora__alerta">Vencida há mais de 30 dias: dirigir é infração gravíssima (CTB, art. 162, V).</p>}
              <ActionLink to="/cadastro?documento=cnh" variant="primary" size="lg">Receber aviso antes de vencer<ArrowRight size={17} aria-hidden="true" /></ActionLink>
            </>
          )}
        </div>
        <p className="calculadora__privacidade"><ShieldCheck size={15} aria-hidden="true" />A conta é feita no seu navegador. A data de nascimento não é enviada nem salva.</p>
      </section>

      <article className="privacy-body info-body calculadora__texto">
        <section id="como-funciona">
          <h2>Como a conta é feita</h2>
          <p>O exame médico que renova a CNH vale 10 anos para quem tem menos de 50 anos, 5 anos de 50 a 69 anos e 3 anos a partir de 70, contados da data do exame (CTB, art. 147, § 2º). O médico perito pode encurtar esse prazo, então a data impressa na CNH é sempre a referência.</p>
          <p>Depois do vencimento há 30 dias de tolerância. Passou disso, dirigir é infração gravíssima: R$ 293,47 e 7 pontos (art. 162, V).</p>
        </section>
        <section id="perguntas">
          <h2>Perguntas</h2>
          <dl>
            {calculadora.faqs.map(item => <div key={item.pergunta}><dt>{item.pergunta}</dt><dd>{item.resposta}</dd></div>)}
          </dl>
        </section>
        <p><Link className="landing-row__link" to="/guias/cnh-vencida">CNH vencida: o que acontece e a renovação automática<ArrowUpRight size={16} aria-hidden="true" /></Link></p>
      </article>
    </PublicShell>
  )
}
