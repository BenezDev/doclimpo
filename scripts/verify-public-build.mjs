import assert from 'node:assert/strict'
import { readdir, readFile, stat } from 'node:fs/promises'
import { getPageMeta, publicPages } from '../src/lib/page-meta.ts'

const dist = new URL('../dist/', import.meta.url)
// Mesmas regras da Cloudflare (wrangler.jsonc + dist/_redirects): redirect ou
// reescrita do _redirects primeiro; depois o arquivo exato; depois a pasta com
// index.html (html_handling drop-trailing-slash); o resto é 404.html com 404.
const redirects = (await readFile(new URL('./_redirects', dist), 'utf8')).split('\n')
  .map(linha => linha.trim()).filter(linha => linha && !linha.startsWith('#'))
  .map(linha => { const [from, to, status] = linha.split(/\s+/); return { from, to, status: Number(status ?? 302) } })

async function fileExists(path) {
  try { return (await stat(new URL(`.${path}`, dist))).isFile() } catch { return false }
}

async function resolveConfiguredRoute(path) {
  for (const regra of redirects) {
    const casa = regra.from.endsWith('/*') ? path.startsWith(regra.from.slice(0, -1)) : path === regra.from
    if (!casa) continue
    if (regra.status === 200) return resolveConfiguredRoute(regra.to)
    return { redirect: regra.to, status: regra.status }
  }
  if (await fileExists(path)) return { file: path, status: 200 }
  const pasta = `${path.replace(/\/$/, '')}/index.html`
  if (await fileExists(pasta)) return { file: pasta, status: 200 }
  if (await fileExists(`${path}.html`)) return { file: `${path}.html`, status: 200 }
  return { file: '/404.html', status: 404 }
}

const checks = [...Object.keys(publicPages), '/cadastro/', '/documento/fixture', '/pagina-inexistente', '/dashboard/inexistente', '/__proto__']
for (const path of checks) {
  const { file, status } = await resolveConfiguredRoute(path)
  assert.ok(await fileExists(file), `Arquivo de destino ausente: ${file}. Execute npm run build.`)
  const html = await readFile(new URL(`.${file}`, dist), 'utf8')
  const meta = getPageMeta(path)
  assert.ok(html.includes(`<title>${meta.title}</title>`), `Título incorreto em ${path}`)
  assert.ok(html.includes(`name="description" content="${meta.description}"`), `Descrição incorreta em ${path}`)
  assert.ok(html.includes(`name="robots" content="${meta.index ? 'index' : 'noindex'},follow"`))
  assert.equal(status, meta.path === '/404' && path !== '/404' ? 404 : 200, `Status configurado incorreto: ${path}`)
  // Páginas indexáveis: conteúdo pré-renderizado (exceto o formulário de cadastro) e JSON-LD que o Google consegue ler.
  if (meta.index && meta.path !== '/cadastro') assert.match(html, /<div id="root"><[^>]+>[\s\S]*<h1/, `Sem conteúdo pré-renderizado: ${path}`)
  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
  assert.equal(blocos.length, meta.index ? 1 : 0, `JSON-LD em ${path}`)
  if (meta.index) assert.equal(blocos[0]['@context'], 'https://schema.org')
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) assert.ok(await fileExists(match[1]), `Asset ausente: ${match[1]}`)
  // A CSP é `script-src 'self'`: um <script> com código no próprio HTML seria
  // bloqueado e a página quebraria em silêncio. JSON-LD não executa, então
  // passa. Todo script de verdade tem que vir de arquivo nosso.
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, atributos, conteudo] = match
    if (/type="application\/ld\+json"/.test(atributos)) continue
    assert.match(atributos, /\ssrc="\/[^"]+"/, `Script inline bloqueado pela CSP em ${path}: ${conteudo.trim().slice(0, 80)}`)
  }
  // Subrecursos do próprio domínio (script, folha de estilo, ícone, manifest).
  // `href` de <a> fica fora: aquilo é rota da aplicação, não arquivo.
  for (const tag of html.matchAll(/<(?:script|link|img)\b[^>]*>/g)) {
    const recurso = tag[0].match(/(?:src|href)="(\/[^"?#][^"?#]*)"/)
    if (!recurso || recurso[1].startsWith('/assets/')) continue
    assert.ok(await fileExists(recurso[1]), `Subrecurso ausente: ${recurso[1]} (${path})`)
  }
}
const chaveIndexNow = (await readdir(dist)).find(nome => /^[0-9a-f]{32}\.txt$/.test(nome))
assert.ok(chaveIndexNow, 'Chave do IndexNow ausente em dist/')
for (const path of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/site.webmanifest', '/og.png', '/sw.js', '/sitemap.xml', '/robots.txt', `/${chaveIndexNow}`]) {
  const route = await resolveConfiguredRoute(path)
  assert.equal(route.file, path)
  assert.equal(route.status, 200)
}
assert.equal((await resolveConfiguredRoute('/assets/arquivo-inexistente.js')).status, 404)
// Slugs antigos com underline redirecionam para os novos, com hífen.
for (const [antigo, novo] of [['/documentos/plano_saude', '/documentos/plano-de-saude'], ['/documentos/carteira_trabalho', '/documentos/carteira-de-trabalho']]) {
  assert.deepEqual(await resolveConfiguredRoute(antigo), { redirect: novo, status: 301 })
}
const sitemap = await readFile(new URL('./sitemap.xml', dist), 'utf8')
for (const page of Object.values(publicPages)) assert.equal(sitemap.includes(`<loc>https://www.doclimpo.com${page.path}</loc><lastmod>`), page.index, `sitemap: ${page.path}`)
assert.match(await readFile(new URL('./robots.txt', dist), 'utf8'), /Sitemap: https:\/\/www\.doclimpo\.com\/sitemap\.xml/)
console.log(`${checks.length} rotas: metadados e assets do build válidos; regras locais de 404 e arquivos estáticos conferidas. Não substitui teste na Cloudflare (npm run preview:cloudflare).`)
