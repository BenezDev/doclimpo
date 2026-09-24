import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { getPageMeta, publicPages } from '../src/lib/page-meta.ts'

const dist = new URL('../dist/', import.meta.url)
const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))

async function fileExists(path) {
  try { return (await stat(new URL(`.${path}`, dist))).isFile() } catch { return false }
}

async function resolveConfiguredRoute(path) {
  for (const route of config.routes) {
    // Rotas com `continue` só adicionam headers e seguem para a próxima (semântica da Vercel).
    if (route.continue) continue
    if (route.headers?.Location && new RegExp(`^${route.src}$`, 'i').test(path)) return { redirect: route.headers.Location, status: route.status }
    if (route.handle === 'filesystem') {
      if (await fileExists(path)) return { file: path, status: 200 }
      continue
    }
    if (new RegExp(`^${route.src}$`, 'i').test(path)) return { file: route.dest, status: route.status ?? 200 }
  }
  throw new Error(`Sem regra para ${path}`)
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
  assert.equal(status, meta.path === '/404' ? 404 : 200, `Status configurado incorreto: ${path}`)
  // Páginas indexáveis: conteúdo pré-renderizado (exceto o formulário de cadastro) e JSON-LD que o Google consegue ler.
  if (meta.index && meta.path !== '/cadastro') assert.match(html, /<div id="root"><[^>]+>[\s\S]*<h1/, `Sem conteúdo pré-renderizado: ${path}`)
  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
  assert.equal(blocos.length, meta.index ? 1 : 0, `JSON-LD em ${path}`)
  if (meta.index) assert.equal(blocos[0]['@context'], 'https://schema.org')
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) assert.ok(await fileExists(match[1]), `Asset ausente: ${match[1]}`)
}
for (const path of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/site.webmanifest', '/og.png', '/sw.js', '/sitemap.xml', '/robots.txt']) {
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
console.log(`${checks.length} rotas: metadados e assets do build válidos; regras locais de 404 e arquivos estáticos conferidas. Não substitui teste na Vercel.`)
