import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

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

test('landing renderiza oito FAQs, os custos do CTB com fonte e links reais', async () => {
  const html = await renderPage('Landing_1', '/')
  assert.equal((html.match(/<details /g) ?? []).length, 8)
  assert.equal((html.match(/class="landing-custo"/g) ?? []).length, 4)
  assert.equal((html.match(/href="https:\/\/www\.planalto\.gov\.br\/ccivil_03\/leis\/l9503compilado\.htm"/g) ?? []).length, 4)
  for (const text of ['R$ 293,47', 'art. 162', 'art. 230', 'art. 284']) assert.ok(html.includes(text), text)
  for (const path of ['/cadastro', '/cadastro?documento=cnh', '/cadastro?documento=ipva', '/cadastro?documento=multa', '/privacidade', '/termos', '/login', '/sobre', '/seguranca', '/documentos/cnh']) assert.ok(html.includes(`href="${path}"`), path)
  assert.doesNotMatch(html, /href="#"|dados ilustrativos|Cenários ilustrativos/)
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]))
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(match[1]), `âncora ausente: ${match[1]}`)
})
test('landing tem h1 único, âncoras do topo fixo, ilustração rotulada e nenhum recurso externo', async () => {
  const html = await renderPage('Landing_1', '/')
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1)
  for (const id of ['como-funciona', 'custo', 'planos', 'gratuito', 'perguntas']) assert.ok(html.includes(`id="${id}"`), `âncora ausente: #${id}`)
  assert.doesNotMatch(html, /<script[^>]*\ssrc=|<img[^>]*\ssrc="http/)
  assert.match(html, /aria-label="Ilustração: celular/)
  // Rodapé sem CNPJ enquanto support.cnpj for null.
  assert.doesNotMatch(html, /CNPJ/)
  assert.match(html, /<nav[^>]*aria-label="Seções da página"/)
  assert.match(html, /href="\/login"/)
  assert.match(html, /Começar grátis/)
})
test('landing preserva ?documento= nos links de cadastro e login e leva o plano escolhido', async () => {
  const html = await renderPage('Landing_1', '/?documento=passaporte')
  assert.match(html, /href="\/cadastro\?documento=passaporte"/)
  assert.match(html, /href="\/login\?documento=passaporte"/)
  // Topo, abertura, plano grátis e chamada final levam a intenção; só o rodapé tem o cadastro genérico.
  assert.ok((html.match(/href="\/cadastro\?documento=passaporte"/g) ?? []).length >= 4)
  assert.equal((html.match(/href="\/cadastro"/g) ?? []).length, 1)
  const planos = await renderPage('Landing_1', '/')
  for (const slug of ['individual', 'mei', 'familia']) assert.ok(planos.includes(`href="/cadastro?plano=${slug}"`), slug)
  for (const text of ['Escolher Individual', 'Escolher MEI', 'Escolher Família']) assert.ok(planos.includes(text), text)
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
  for (const text of ['Supabase', 'Resend', 'Google Fonts', 'ViaCEP', 'Vercel', 'Serviços de push do navegador', 'Retenção e exclusão', 'Responsável e contato', 'Bases legais', 'Encarregado de dados']) assert.ok(html.includes(text), text)
  assert.doesNotMatch(html, /não inclui ferramentas de publicidade ou analytics/)
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
  for (const text of ['Avisos por e-mail', 'Enviar e-mail de teste', 'Notificações no navegador', 'Trocar senha', 'Onde renovar perto de você', 'Meu veículo', 'id="veiculo-placa"', 'Plano gratuito', 'Ver planos', 'Exportar meus dados', 'Excluir conta', 'pessoa@example.test']) assert.ok(html.includes(text), text)
  assert.match(html, /role="switch"/)
  assert.match(html, /href="\/termos"/)
  assert.match(html, /href="\/privacidade"/)
  assert.doesNotMatch(html, /Quem faz parte/)
  // O painel de WhatsApp só existe quando o interruptor de lançamento estiver ligado.
  const { WHATSAPP_DISPONIVEL } = await server.ssrLoadModule('/src/lib/planos.ts')
  assert.equal(html.includes('id="conta-whatsapp"'), WHATSAPP_DISPONIVEL)
  const privacidade = await renderPage('Privacy', '/privacidade')
  assert.equal(privacidade.includes('Meta Platforms'), WHATSAPP_DISPONIVEL)
})
test('landing apresenta os três planos com os preços combinados e o gratuito como porta de entrada', async () => {
  const html = await renderPage('Landing_1', '/')
  assert.match(html, /id="planos"/)
  for (const text of ['R$ 9,90', 'R$ 19,89', 'R$ 29,89', 'Individual', 'MEI', 'Família', 'Mais escolhido', 'até 4 pessoas', '7 dias']) assert.ok(html.includes(text), text)
  assert.equal((html.match(/class="plano-card[ "]/g) ?? []).length, 3)
})
test('diálogo de renovação sugere +1 ano e oferece encerrar sem novo prazo, sem tocar no backend', async () => {
  const { RenovarDialog } = await server.ssrLoadModule('/src/components/ui/RenovarDialog.tsx')
  const html = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/documento/x'] },
    createElement(RenovarDialog, { documento: { id: 'x', tipo: 'cnh', apelido: null, data_vencimento: '2026-10-12' }, nome: 'CNH', onClose() {}, onRenovado() {}, onEncerrado() {} })))
  assert.match(html, /Renovou CNH\?/)
  assert.match(html, /value="2027-10-12"/)
  assert.match(html, /Renovar com novo prazo/)
  assert.match(html, /Encerrar sem novo prazo/)
  assert.match(html, /90, 30, 7 e 1 dia/)
  assert.match(html, /Calcular pela idade/)
  const ipva = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/documento/y'] },
    createElement(RenovarDialog, { documento: { id: 'y', tipo: 'ipva', apelido: null, data_vencimento: '2026-01-23', extra: { uf: 'SP', placa_final: '5' } }, nome: 'IPVA', onClose() {}, onRenovado() {}, onEncerrado() {} })))
  assert.match(ipva, /Sugerir pelo calendário 2027/)
  assert.match(ipva, /value="SP"/)
  // Multa: próximo prazo é a próxima notificação (+30 dias de hoje), com cópia própria.
  const { hojeISO, somarDias } = await server.ssrLoadModule('/src/lib/datas.ts')
  const multa = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/documento/z'] },
    createElement(RenovarDialog, { documento: { id: 'z', tipo: 'multa', apelido: null, data_vencimento: '2026-10-12', extra: { uf: 'SP', placa_final: '5' } }, nome: 'Multa', onClose() {}, onRenovado() {}, onEncerrado() {} })))
  assert.match(multa, /Resolveu a multa\?/)
  assert.ok(multa.includes(`value="${somarDias(hojeISO(), 30)}"`))
  assert.match(multa, /Cadastrar próximo prazo/)
  assert.match(multa, /Encerrar: paga ou resolvida/)
  assert.match(multa, /Calcular pelo prazo legal/)
  assert.match(multa, /30, 7 e 1 dia/)
  assert.doesNotMatch(multa, /Renovou/)
})
test('páginas públicas por documento: h1 único, CTA com o tipo, portal oficial e hub com todos os links', async () => {
  const { default: DocumentoPublico } = await server.ssrLoadModule('/src/pages/DocumentoPublico.tsx')
  const renderTipo = (location) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [location] },
    createElement(AuthContext.Provider, { value: { user: null, loading: false, session: null, signOut: async () => {} } },
      createElement(Routes, null, createElement(Route, { path: '/documentos/:tipo', element: createElement(DocumentoPublico) })))))
  const cnh = renderTipo('/documentos/cnh')
  assert.equal((cnh.match(/<h1[\s>]/g) ?? []).length, 1)
  assert.match(cnh, /href="\/cadastro\?documento=cnh"/)
  assert.match(cnh, /https:\/\/www\.gov\.br\/pt-br\/servicos\/renovar-a-carteira-nacional-de-habilitacao/)
  assert.match(cnh, /Lei 14\.071\/2020/)
  assert.doesNotMatch(cnh, /<script[^>]*\ssrc=|<img[^>]*\ssrc="http/)
  const desconhecido = renderTipo('/documentos/xyz')
  assert.match(desconhecido, /Erro 404/)
  const multa = renderTipo('/documentos/multa')
  assert.equal((multa.match(/<h1[\s>]/g) ?? []).length, 1)
  assert.match(multa, /Onde consultar e pagar/)
  assert.match(multa, /portalservicos\.senatran\.serpro\.gov\.br/)
  assert.match(multa, /art\. 284/)
  assert.doesNotMatch(multa, /validade, renovação e alerta/)
  const hub = await renderPage('DocumentosHub', '/documentos')
  const { SLUGS_PUBLICOS } = await server.ssrLoadModule('/src/lib/documentos-publicos.ts')
  assert.equal(SLUGS_PUBLICOS.length, 12)
  for (const slug of SLUGS_PUBLICOS) assert.ok(hub.includes(`href="/documentos/${slug}"`), slug)
})
test('sobre e segurança: h1 único, contato real, links para privacidade e nada de CNPJ inventado', async () => {
  for (const [pagina, rota] of [['Sobre', '/sobre'], ['Seguranca', '/seguranca']]) {
    const html = await renderPage(pagina, rota)
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, pagina)
    assert.match(html, /mailto:/, pagina)
    assert.match(html, /href="\/privacidade"/, pagina)
    assert.doesNotMatch(html, /CNPJ/, pagina)
  }
  const seguranca = await renderPage('Seguranca', '/seguranca')
  for (const text of ['CPF', 'gov.br', 'Cakto', 'Exporta'.toLowerCase()]) assert.ok(seguranca.toLowerCase().includes(text.toLowerCase()), text)
})
test('paywall lista os três planos, destaca o Individual e nunca envia preço ao servidor', async () => {
  const { PlanosModal } = await server.ssrLoadModule('/src/components/ui/PlanosModal.tsx')
  const render = (props) => renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/dashboard'] }, createElement(PlanosModal, { onClose() {}, ...props })))
  const limite = render({ motivo: 'limite' })
  assert.match(limite, /monitora 1 documento/)
  for (const text of ['Assinar Individual', 'Assinar MEI', 'Assinar Família', 'R$ 9,90', 'R$ 29,89', 'R$ 19,89', 'Mais escolhido', 'href="\/termos"']) assert.ok(limite.includes(text), text)
  assert.equal((limite.match(/plano-card--destaque/g) ?? []).length, 1)
  const sugerido = render({ motivo: 'escolha', planoSugerido: 'familia' })
  assert.equal((sugerido.match(/plano-card--destaque/g) ?? []).length, 1)
  assert.match(sugerido, /Sua escolha/)
  assert.doesNotMatch(sugerido, /Mais escolhido/)
  const atual = render({ motivo: 'escolha', planoAtual: 'MEI' })
  assert.match(atual, /Seu plano atual/)
  assert.doesNotMatch(atual, /Assinar MEI/)
  const fonte = await readFile(new URL('../src/components/ui/PlanosModal.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(fonte, /price_|precoCentavos.*invoke|body: \{ plano, /)
  assert.match(fonte, /body: \{ plano \}/)
})
test('painel do carro: dashboard pede a placa, modal abre em multa com o prazo legal, e o detalhe lista canais oficiais fixos', async () => {
  // Dashboard sem veículo: card "Seu carro" com o formulário compacto; effects não rodam no SSR.
  const dashboard = await renderPage('Dashboard', '/dashboard', { user: { id: 'fixture-user', email: 'pessoa@example.test', user_metadata: { nome: 'Pessoa' } } })
  assert.match(dashboard, /id="dashboard-veiculo-titulo"/)
  assert.match(dashboard, /Cadastre a placa/)
  assert.match(dashboard, /id="veiculo-placa-compacto"/)

  // Modal já em "Multa de trânsito", com UF e final da placa do veículo indo para o extra.
  const { AddDocumentModal } = await server.ssrLoadModule('/src/components/ui/AddDocumentModal.tsx')
  const modal = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/dashboard'] },
    createElement(AuthContext.Provider, { value: { user: { id: 'fixture-user' }, loading: false, session: null, signOut: async () => {} } },
      createElement(AddDocumentModal, { dark: false, tipoInicial: 'multa', veiculo: { uf: 'SP', placa: 'ABC1D23' }, onClose() {}, onSuccess() {} }))))
  assert.match(modal, /ETAPA 02 \/ 02/)
  assert.match(modal, /Multa de trânsito selecionado/)
  assert.match(modal, /Data-limite do prazo/)
  assert.match(modal, /Calcular pelo prazo legal/)
  assert.match(modal, /Defesa prévia ou indicação do condutor/)
  assert.match(modal, /O DocLimpo não consulta multas/)

  // Canais oficiais: Detran da UF (quando conferido) + SENATRAN + SNE; nunca a placa na URL.
  const { OndeConsultarMultas } = await server.ssrLoadModule('/src/components/ui/OndeConsultarMultas.tsx')
  const sp = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/documento/x'] }, createElement(OndeConsultarMultas, { uf: 'SP' })))
  assert.match(sp, /Onde consultar e pagar/)
  assert.match(sp, /detran\.sp\.gov\.br/)
  assert.match(sp, /minha-adesao-sne/)
  assert.equal((sp.match(/target="_blank" rel="noopener noreferrer"/g) ?? []).length, 3)
  assert.doesNotMatch(sp, /ABC1D23/)
  const semUf = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: ['/documento/x'] }, createElement(OndeConsultarMultas, { uf: null })))
  assert.match(semUf, /href="\/conta"/)
  assert.equal((semUf.match(/target="_blank"/g) ?? []).length, 2)
})
