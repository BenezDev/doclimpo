import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

const previewCachePath = new URL('../node_modules/.vite/deps/_metadata.json', import.meta.url)
async function readPreviewCache() {
  try { return await readFile(previewCachePath, 'utf8') } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}
const previewCacheBefore = await readPreviewCache()

const server = await createServer({
  configFile: false,
  // SSR tests must never invalidate dependencies served by the live preview.
  cacheDir: fileURLToPath(new URL('../node_modules/.vite-render-tests', import.meta.url)),
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null },
  appType: 'custom',
  plugins: [{
    name: 'block-backend-in-render-tests',
    enforce: 'pre',
    resolveId(id) { if (id.includes('integrations/supabase/client')) return '\0test-auth-client' },
    load(id) { if (id === '\0test-auth-client') return 'export const supabase = new Proxy({}, { get() { throw new Error("Backend access forbidden in render tests") } })' },
  }],
})
after(async () => {
  await server.close()
  assert.equal(await readPreviewCache(), previewCacheBefore, 'Os testes alteraram o cache da prévia ativa')
})
const { AuthContext } = await server.ssrLoadModule('/src/context/auth-context.ts')

test('servidor de testes usa cache isolado e não otimiza dependências do navegador', () => {
  assert.equal(server.config.cacheDir, fileURLToPath(new URL('../node_modules/.vite-render-tests', import.meta.url)))
  assert.equal(server.config.optimizeDeps.noDiscovery, true)
  assert.deepEqual(server.config.optimizeDeps.include, [])
})

async function renderPage(path, location, { user = null, loading = false, props = {} } = {}) {
  const { default: Page } = await server.ssrLoadModule(`/src/pages/${path}.tsx`)
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [location] },
    createElement(AuthContext.Provider, { value: { user, loading, session: null, signOut: async () => {} } }, createElement(Page, props))))
}

test('landing renderiza cinco FAQs, três cases rotulados e links reais', async () => {
  const html = await renderPage('Landing_1', '/')
  assert.equal((html.match(/<details /g) ?? []).length, 5)
  assert.equal((html.match(/class="landing-card case-card"/g) ?? []).length, 3)
  assert.match(html, /Cenários ilustrativos/)
  for (const path of ['/cadastro', '/cadastro?documento=cnh', '/cadastro?documento=passaporte', '/cadastro?documento=seguro', '/privacidade', '/termos', '/login']) assert.ok(html.includes(`href="${path}"`))
  assert.doesNotMatch(html, /href="#"|SYNC 09:00/)
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]))
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(match[1]), `âncora ausente: ${match[1]}`)
})
test('landing tem h1 único, âncoras do topo fixo, mock rotulado e nenhum recurso externo', async () => {
  const html = await renderPage('Landing_1', '/')
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1)
  for (const id of ['como-funciona', 'casos', 'planos', 'gratuito', 'perguntas', 'atendimento']) assert.ok(html.includes(`id="${id}"`), `âncora ausente: #${id}`)
  assert.doesNotMatch(html, /<script[^>]*\ssrc=|<img[^>]*\ssrc="http/)
  assert.match(html, /dados ilustrativos/)
  assert.match(html, /<nav[^>]*aria-label="Seções da página"/)
  assert.match(html, /href="\/login"/)
  assert.match(html, /Começar grátis/)
})
test('landing preserva ?documento= nos links de cadastro e login', async () => {
  const html = await renderPage('Landing_1', '/?documento=passaporte')
  assert.match(html, /href="\/cadastro\?documento=passaporte"/)
  assert.match(html, /href="\/login\?documento=passaporte"/)
  assert.doesNotMatch(html, /href="\/cadastro"/)
})
test('cadastro abre o formulário certo e login usa senha existente', async () => {
  const register = await renderPage('Login', '/cadastro', { props: { isCadastro: true } })
  const login = await renderPage('Login', '/login')
  assert.match(register, /Crie sua conta/)
  assert.match(register, /autoComplete="new-password"/)
  assert.match(register, /href="\/privacidade"/)
  assert.doesNotMatch(login, /id="nome"/)
  assert.match(login, /autoComplete="current-password"/)
})
test('agradecimento direto não alega conta criada', async () => {
  const html = await renderPage('ThankYou', '/obrigado')
  assert.doesNotMatch(html, /Sua conta está pronta/)
  assert.match(html, /Criar conta gratuita/)
})
test('agradecimento pendente orienta confirmação sem afirmar entrega', async () => {
  const html = await renderPage('ThankYou', { pathname: '/obrigado', search: '?documento=passaporte', state: { signup: 'pending' } })
  assert.match(html, /Confira seu e-mail/)
  assert.match(html, /Se o endereço estiver disponível/)
  assert.match(html, /href="\/login\?documento=passaporte"/)
})
test('agradecimento ativo permite cadastrar documento; sessão expirada não simula sucesso', async () => {
  const location = { pathname: '/obrigado', state: { signup: 'active' } }
  const active = await renderPage('ThankYou', location, { user: { id: 'fixture-user' } })
  assert.match(active, /Sua conta está pronta/)
  assert.match(active, /href="\/onboarding"/)
  assert.doesNotMatch(await renderPage('ThankYou', location), /Sua conta está pronta/)
})
test('404 oferece início e painel sem reproduzir a URL inválida', async () => {
  const html = await renderPage('NotFound', '/private-invalid-url')
  assert.match(html, /Erro 404/)
  assert.match(html, /href="\/"/)
  assert.match(html, /href="\/dashboard"/)
  assert.doesNotMatch(html, /private-invalid-url/)
})
test('política informa escopo real, bases legais, controles da conta e fontes oficiais', async () => {
  const html = await renderPage('Privacy', '/privacidade')
  assert.doesNotMatch(html, /Minuta em revisão/)
  assert.match(html, /Responsável pelo tratamento:<\/strong> \S/)
  assert.match(html, /mailto:/)
  for (const text of ['Supabase', 'Resend', 'Google Fonts', 'ViaCEP', 'Retenção e exclusão', 'Responsável e contato', 'Bases legais', 'Encarregado de dados']) assert.ok(html.includes(text), text)
  assert.match(html, /endereço residencial/)
  assert.match(html, /href="\/conta"/)
  assert.match(html, /https:\/\/www.gov.br\/anpd\//)
  assert.doesNotMatch(html, /mailto:alertas@/)
  assert.doesNotMatch(html, /não oferece exclusão completa/)
})
test('termos cobrem plano gratuito, arrependimento, alertas como apoio e foro do consumidor', async () => {
  const html = await renderPage('Termos', '/termos')
  assert.doesNotMatch(html, /Minuta em revisão/)
  assert.match(html, /Responsável pelo serviço:<\/strong> \S/)
  assert.match(html, /mailto:/)
  for (const text of ['um documento', '7 dias', '90, 30, 7 e 1 dia', 'foro do seu domicílio', 'Código de Defesa do Consumidor']) assert.ok(html.includes(text), text)
  assert.match(html, /href="\/privacidade"/)
  assert.match(html, /href="\/conta"/)
})
test('login oferece recuperação de senha; cadastro não', async () => {
  const login = await renderPage('Login', '/login')
  const register = await renderPage('Login', '/cadastro', { props: { isCadastro: true } })
  assert.match(login, /Esqueci minha senha/)
  assert.doesNotMatch(register, /Esqueci minha senha/)
})
test('redefinição de senha sem sessão não mostra formulário; com sessão pede confirmação', async () => {
  const semSessao = await renderPage('RedefinirSenha', '/redefinir-senha')
  assert.match(semSessao, /inválido ou já expirou/)
  assert.doesNotMatch(semSessao, /id="nova-senha"/)
  const comSessao = await renderPage('RedefinirSenha', '/redefinir-senha', { user: { id: 'fixture-user' } })
  assert.match(comSessao, /id="nova-senha"/)
  assert.match(comSessao, /id="confirmar-senha"/)
  assert.match(comSessao, /autoComplete="new-password"/)
})
test('conta expõe alertas, senha, endereço, plano, exportação e exclusão sem tocar no backend na renderização', async () => {
  const html = await renderPage('Conta', '/conta', { user: { id: 'fixture-user', email: 'pessoa@example.test', user_metadata: { nome: 'Pessoa' } } })
  for (const text of ['Avisos por e-mail', 'Enviar e-mail de teste', 'Trocar senha', 'Onde renovar perto de você', 'Plano gratuito', 'Ver planos', 'Exportar meus dados', 'Excluir conta', 'pessoa@example.test']) assert.ok(html.includes(text), text)
  assert.match(html, /role="switch"/)
  assert.match(html, /href="\/termos"/)
  assert.match(html, /href="\/privacidade"/)
  assert.doesNotMatch(html, /Quem faz parte/)
})
test('landing apresenta os três planos com os preços combinados e o gratuito como porta de entrada', async () => {
  const html = await renderPage('Landing_1', '/')
  assert.match(html, /id="planos"/)
  for (const text of ['R$ 9,90', 'R$ 19,89', 'R$ 29,89', 'Individual', 'MEI', 'Família', 'Mais escolhido', 'até 4 pessoas', '7 dias']) assert.ok(html.includes(text), text)
  assert.equal((html.match(/class="plano-card[ "]/g) ?? []).length, 3)
})
test('paywall lista os três planos, destaca o Individual e nunca envia preço ao servidor', async () => {
  const { PlanosModal } = await server.ssrLoadModule('/src/components/ui/PlanosModal.tsx')
  const render = (props) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/dashboard'] }, createElement(PlanosModal, { onClose() {}, ...props })))
  const limite = render({ motivo: 'limite' })
  assert.match(limite, /monitora 1 documento/)
  for (const text of ['Assinar Individual', 'Assinar MEI', 'Assinar Família', 'R$ 9,90', 'R$ 29,89', 'R$ 19,89', 'Mais escolhido', 'href="\/termos"']) assert.ok(limite.includes(text), text)
  assert.equal((limite.match(/plano-card--destaque/g) ?? []).length, 1)
  const atual = render({ motivo: 'escolha', planoAtual: 'MEI' })
  assert.match(atual, /Seu plano atual/)
  assert.doesNotMatch(atual, /Assinar MEI/)
  const fonte = await readFile(new URL('../src/components/ui/PlanosModal.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(fonte, /price_|precoCentavos.*invoke|body: \{ plano, /)
  assert.match(fonte, /body: \{ plano \}/)
})
