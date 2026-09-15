import { documentIntent, withDocumentIntent } from './public-content.ts'

interface AuthPort {
  signUp: (input: { email: string; password: string; options: { data: { nome: string } } }) => Promise<{ data: { session: unknown }; error: unknown }>
  signInWithPassword: (input: { email: string; password: string }) => Promise<{ error: unknown }>
}

type AccessResult = { error: string } | { to: string; state?: { signup: 'active' | 'pending' } }

// O supabase-js devolve falhas de rede como `error` (não lança). Sem esta
// tradução, "backend fora do ar" virava "confira os dados" — e o usuário
// ficava corrigindo um formulário que estava certo. Só mapeamos códigos
// públicos do Auth; nunca repassamos a mensagem interna.
const MENSAGEM_CONEXAO = 'Não foi possível conectar ao serviço. Confira sua conexão e tente de novo em instantes.'

export function traduzirErroAuth(error: unknown, contexto: 'signup' | 'login'): string {
  const detalhe = (error ?? {}) as { name?: string; code?: string; status?: number; message?: string }
  const mensagem = detalhe.message ?? ''
  if (detalhe.name === 'AuthRetryableFetchError' || detalhe.status === 0 || /fetch|network|failed to fetch/i.test(mensagem)) return MENSAGEM_CONEXAO
  if (detalhe.code === 'over_email_send_rate_limit' || detalhe.code === 'over_request_rate_limit' || detalhe.status === 429) return 'Muitas tentativas agora. Aguarde alguns minutos e tente de novo.'
  if (contexto === 'signup') {
    if (detalhe.code === 'user_already_exists' || detalhe.code === 'email_exists' || /already registered/i.test(mensagem)) return 'Este e-mail já tem uma conta. Escolha Entrar ou use "Esqueci minha senha".'
    if (detalhe.code === 'signup_disabled') return 'O cadastro está temporariamente desativado. Tente mais tarde.'
    if (detalhe.code === 'weak_password') return 'Senha fraca. Use pelo menos 6 caracteres, misturando letras e números.'
    if (detalhe.code === 'email_address_invalid' || detalhe.code === 'validation_failed') return 'E-mail inválido. Confira o endereço e tente de novo.'
    return 'Não foi possível criar a conta. Confira os dados e tente novamente. Se já tem uma conta, escolha Entrar.'
  }
  if (detalhe.code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar. Procure a mensagem de confirmação na caixa de entrada ou no spam.'
  return 'Não foi possível entrar. Confira e-mail, senha e a confirmação do seu cadastro.'
}

export async function submitAccess(auth: AuthPort, input: { signup: boolean; email: string; password: string; name: string; search: string }): Promise<AccessResult> {
  try {
    if (input.signup) {
      const { data, error } = await auth.signUp({ email: input.email.trim(), password: input.password, options: { data: { nome: input.name.trim() } } })
      if (error) return { error: traduzirErroAuth(error, 'signup') }
      return { to: withDocumentIntent('/obrigado', input.search), state: { signup: data.session ? 'active' : 'pending' } }
    }
    const { error } = await auth.signInWithPassword({ email: input.email.trim(), password: input.password })
    if (error) return { error: traduzirErroAuth(error, 'login') }
    return { to: withDocumentIntent(documentIntent(input.search) ? '/onboarding' : '/dashboard', input.search) }
  } catch {
    return { error: MENSAGEM_CONEXAO }
  }
}

interface RecoveryPort {
  resetPasswordForEmail: (email: string, options: { redirectTo: string }) => Promise<{ error: unknown }>
}

// Nunca revela se o e-mail existe: a resposta é a mesma para qualquer endereço.
export async function requestPasswordReset(auth: RecoveryPort, input: { email: string; origin: string }): Promise<{ ok: true } | { error: string }> {
  const email = input.email.trim()
  if (!email) return { error: 'Informe o e-mail da sua conta.' }
  try {
    const { error } = await auth.resetPasswordForEmail(email, { redirectTo: `${input.origin}/redefinir-senha` })
    if (error) return { error: 'Não foi possível enviar o link agora. Tente novamente em instantes.' }
    return { ok: true }
  } catch {
    return { error: 'Não foi possível conectar. Confira sua conexão e tente novamente.' }
  }
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.'
  if (password !== confirmation) return 'As senhas não coincidem.'
  return null
}
