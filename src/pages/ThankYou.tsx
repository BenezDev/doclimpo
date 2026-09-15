import { ArrowRight, Check, Mail } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { PublicShell } from '../components/ui/PublicShell'
import { ActionLink } from '../components/ui/ActionLink'
import { useAuth } from '../hooks/useAuth'
import { withDocumentIntent } from '../lib/public-content'

export default function ThankYou() {
  const { state, search } = useLocation()
  const { user, loading } = useAuth()
  const pending = state?.signup === 'pending' && !user
  const registered = state?.signup === 'active' && !!user
  const title = loading ? 'Conferindo seu acesso…' : pending ? 'Obrigado. Confira seu e-mail.' : registered ? 'Sua conta está pronta.' : user ? 'Seu próximo prazo começa aqui.' : 'Menos um prazo para lembrar.'

  return (
    <PublicShell>
      <section className="outcome-layout">
        <div className="outcome-copy">
          <span className="bz-micro">{pending ? 'Cadastro · Confirmação de e-mail' : 'DocLimpo · Próximo passo'}</span>
          <h1>{title}</h1>
          <p>{loading ? 'Só um instante para verificar a sessão neste navegador.' : pending
            ? 'Se o endereço estiver disponível para cadastro, você receberá um link de confirmação. Abra o e-mail para ativar o acesso. Já possui uma conta? Entre com sua senha.'
            : user ? 'Agora escolha um documento e informe quando ele vence. O primeiro é gratuito e não precisa de cartão.'
              : 'Crie sua conta gratuita e organize o vencimento do seu primeiro documento.'}</p>
          {!loading && <div className="outcome-actions">
            <ActionLink to={withDocumentIntent(user ? '/onboarding' : pending ? '/login' : '/cadastro', search)} variant="primary" size="lg">
              {user ? 'Cadastrar meu primeiro documento' : pending ? 'Entrar após confirmar' : 'Criar conta gratuita'}<ArrowRight size={17} />
            </ActionLink>
            <ActionLink to={user ? '/dashboard' : '/'} variant="ghost">{user ? 'Ver meu painel' : 'Voltar ao início'}</ActionLink>
          </div>}
          {pending && <p className="outcome-note"><Mail size={17} aria-hidden="true" />Confira também spam e promoções. Nenhum documento é cadastrado automaticamente.</p>}
        </div>
        <aside className="next-steps" aria-label="Etapas para começar">
          <span className="bz-micro">Seu caminho até o primeiro alerta</span>
          <ol>
            <li className={user ? 'is-complete' : ''}><span>{user ? <Check size={16} /> : '01'}</span><div><strong>Crie e confirme sua conta</strong><p>Um e-mail válido para receber os avisos.</p></div></li>
            <li><span>02</span><div><strong>Cadastre um vencimento</strong><p>Tipo, data e um apelido opcional.</p></div></li>
            <li><span>03</span><div><strong>Acompanhe com antecedência</strong><p>Consulte o painel e fique atento aos e-mails.</p></div></li>
          </ol>
          <div className="next-steps__foot">01 documento gratuito · sem cartão</div>
        </aside>
      </section>
    </PublicShell>
  )
}
