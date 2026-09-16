import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { requestPasswordReset, submitAccess, traduzirErroAuth, validateNewPassword } from '../src/lib/access-flow.ts'
import { documentIntent, withDocumentIntent, faqs, useCases, support, legalPublished } from '../src/lib/public-content.ts'
import { getPageMeta, publicPages } from '../src/lib/page-meta.ts'
import { renderPageHead } from '../build/page-html.ts'

const credentials = { signup: true, email: ' demo@example.test ', password: ' secret123 ', name: ' Demo ', search: '?documento=cnh' }
const mockAuth = (session = null, error = null) => ({
  signUp: async () => ({ data: { session }, error }),
  signInWithPassword: async () => ({ error }),
})

test('cadastro com confirmação pendente vai ao agradecimento, não à rota protegida', async () => {
  assert.deepEqual(await submitAccess(mockAuth(), credentials), { to: '/obrigado?documento=cnh', state: { signup: 'pending' } })
})
test('cadastro com sessão ativa vai ao agradecimento sem timeout', async () => {
  assert.deepEqual(await submitAccess(mockAuth({ user: { id: 'test-user' } }), credentials), { to: '/obrigado?documento=cnh', state: { signup: 'active' } })
})
test('normaliza nome e e-mail sem modificar a senha', async () => {
  let received
  await submitAccess({ ...mockAuth(), signUp: async value => { received = value; return { data: { session: null }, error: null } } }, credentials)
  assert.deepEqual(received, { email: 'demo@example.test', password: ' secret123 ', options: { data: { nome: 'Demo' } } })
})
test('erro de cadastro não navega nem revela detalhes internos', async () => {
  const result = await submitAccess(mockAuth(null, { message: 'private database detail' }), credentials)
  assert.ok(result.error)
  assert.equal('to' in result, false)
  assert.doesNotMatch(result.error, /private database/)
})
test('erro de rede do supabase-js (devolvido, não lançado) vira mensagem de conexão, não "confira os dados"', async () => {
  const semBackend = { name: 'AuthRetryableFetchError', message: 'TypeError: Failed to fetch', status: 0 }
  const result = await submitAccess(mockAuth(null, semBackend), credentials)
  assert.match(result.error, /conectar ao serviço/)
  assert.doesNotMatch(result.error, /Confira os dados|Failed to fetch/)
})
test('códigos públicos do Auth viram mensagens acionáveis sem vazar o texto interno', () => {
  assert.match(traduzirErroAuth({ code: 'user_already_exists', message: 'User already registered' }, 'signup'), /já tem uma conta/)
  assert.match(traduzirErroAuth({ code: 'over_email_send_rate_limit', status: 429, message: 'email rate limit exceeded' }, 'signup'), /Muitas tentativas/)
  assert.match(traduzirErroAuth({ code: 'signup_disabled', message: 'Signups not allowed for this instance' }, 'signup'), /desativado/)
  assert.match(traduzirErroAuth({ code: 'weak_password', message: 'Password should be at least 6 characters' }, 'signup'), /Senha fraca/)
  assert.match(traduzirErroAuth({ code: 'email_not_confirmed', message: 'Email not confirmed' }, 'login'), /Confirme seu e-mail/)
  assert.match(traduzirErroAuth({ code: 'invalid_credentials', message: 'Invalid login credentials' }, 'login'), /Não foi possível entrar/)
  for (const contexto of ['signup', 'login']) assert.doesNotMatch(traduzirErroAuth({ message: 'private database detail' }, contexto), /private/)
})
test('falha de rede gera mensagem recuperável', async () => {
  const result = await submitAccess({ ...mockAuth(), signUp: async () => { throw new Error('offline') } }, credentials)
  assert.match(result.error, /conexão/)
})
test('login comum vai ao painel; case válido preserva intenção', async () => {
  assert.deepEqual(await submitAccess(mockAuth(), { ...credentials, signup: false, search: '' }), { to: '/dashboard' })
  assert.deepEqual(await submitAccess(mockAuth(), { ...credentials, signup: false }), { to: '/onboarding?documento=cnh' })
})
test('erro no login não navega', async () => {
  assert.ok((await submitAccess(mockAuth(null, new Error('invalid')), { ...credentials, signup: false })).error)
})
test('links personalizados usam somente os tipos permitidos', () => {
  for (const item of useCases) assert.equal(documentIntent(`?documento=${item.type}`), item.type)
  for (const search of ['?documento=__proto__', '?documento=https://evil.test', '?next=https://evil.test', '?email=private@example.test']) {
    assert.equal(documentIntent(search), '')
    assert.equal(withDocumentIntent('/cadastro', search), '/cadastro')
  }
  assert.equal(withDocumentIntent('/obrigado', '?documento=cnh&email=private@example.test&token=secret'), '/obrigado?documento=cnh')
})
test('FAQ contém exatamente cinco perguntas distintas', () => {
  assert.equal(faqs.length, 5)
  assert.equal(new Set(faqs.map(item => item.question)).size, 5)
  for (const item of faqs) assert.ok(item.answer.length > 60)
})
test('operador identificado: contato, SLA e responsável preenchidos, páginas legais publicadas', () => {
  assert.match(support.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  assert.match(support.responseTime, /dia/)
  assert.ok(support.controller && support.controller.length > 5)
  assert.equal(legalPublished, true)
})
test('recuperação de senha: mesma resposta para qualquer e-mail, redirect fixo, sem vazar erro interno', async () => {
  let received = null
  const auth = { resetPasswordForEmail: async (email, options) => { received = { email, options }; return { error: null } } }
  assert.deepEqual(await requestPasswordReset(auth, { email: ' pessoa@example.test ', origin: 'https://app.test' }), { ok: true })
  assert.deepEqual(received, { email: 'pessoa@example.test', options: { redirectTo: 'https://app.test/redefinir-senha' } })
  assert.deepEqual(await requestPasswordReset(auth, { email: '   ', origin: 'https://app.test' }), { error: 'Informe o e-mail da sua conta.' })
  const falha = await requestPasswordReset({ resetPasswordForEmail: async () => ({ error: { message: 'private rate limit detail' } }) }, { email: 'a@b.test', origin: 'https://app.test' })
  assert.ok(falha.error && !falha.error.includes('private'))
  const offline = await requestPasswordReset({ resetPasswordForEmail: async () => { throw new Error('offline') } }, { email: 'a@b.test', origin: 'https://app.test' })
  assert.match(offline.error, /conexão/)
})
test('nova senha exige 6 caracteres e confirmação igual', () => {
  assert.equal(validateNewPassword('12345', '12345'), 'A senha precisa ter pelo menos 6 caracteres.')
  assert.equal(validateNewPassword('123456', '1234567'), 'As senhas não coincidem.')
  assert.equal(validateNewPassword('segredo1', 'segredo1'), null)
})
test('rotas inexistentes e dados privados nunca são indexáveis', () => {
  for (const route of ['/inexistente', '/__proto__', '/constructor', '/documento/user-secret-id', '/obrigado', '/dashboard', '/onboarding', '/privacidade', '/termos', '/conta', '/redefinir-senha']) {
    const meta = getPageMeta(route)
    assert.equal(meta.index, false)
    assert.doesNotMatch(JSON.stringify(meta), /user-secret-id/)
  }
})
test('metadados têm descrições distintas e tratam barra final e caixa', () => {
  assert.equal(new Set(Object.values(publicPages).map(item => item.description)).size, Object.keys(publicPages).length)
  assert.equal(getPageMeta('/cadastro/').title, publicPages['/cadastro'].title)
  assert.equal(getPageMeta('/CADASTRO').title, publicPages['/cadastro'].title)
})
test('HTML de cada rota contém metadados únicos sem duplicação', async () => {
  const template = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  for (const [path, meta] of Object.entries(publicPages)) {
    const html = renderPageHead(renderPageHead(template, '/'), path)
    assert.ok(html.includes(`<title>${meta.title}</title>`))
    assert.ok(html.includes(`name="description" content="${meta.description}"`))
    assert.equal((html.match(/name="description"/g) ?? []).length, 1)
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1)
    assert.equal((html.match(/name="robots"/g) ?? []).length, 1)
  }
})
