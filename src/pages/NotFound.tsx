import { ArrowLeft, ArrowRight, FileQuestion } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActionLink } from '../components/ui/ActionLink'
import { PublicShell } from '../components/ui/PublicShell'

export default function NotFound() {
  return (
    <PublicShell>
      <section className="outcome-layout">
        <div className="outcome-copy">
          <span className="bz-micro">Erro 404 · Página não encontrada</span>
          <h1>Este link ficou pelo caminho.</h1>
          <p>A página pode ter mudado de endereço ou o link pode estar incompleto. Seus documentos continuam no painel.</p>
          <div className="outcome-actions">
            <ActionLink to="/" variant="primary" size="lg"><ArrowLeft size={17} />Voltar ao início</ActionLink>
            <ActionLink to="/dashboard" size="lg">Ir para meu painel<ArrowRight size={17} /></ActionLink>
          </div>
          <Link className="text-link" to="/#perguntas">Precisa de uma orientação? Veja as perguntas frequentes.</Link>
        </div>
        <div className="lost-document" aria-hidden="true">
          <span className="bz-micro">Registro de navegação</span>
          <FileQuestion size={42} strokeWidth={1.25} />
          <strong>404<span>ENDEREÇO NÃO LOCALIZADO</span></strong>
          <div className="lost-document__line" /><div className="lost-document__line" />
          <span className="lost-document__stamp">Uma rota de volta está logo ao lado.</span>
        </div>
      </section>
    </PublicShell>
  )
}
