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
  for (const match of html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) assert.ok(await fileExists(match[1]), `Asset ausente: ${match[1]}`)
}
for (const path of ['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/site.webmanifest', '/og.png', '/sw.js']) {
  const route = await resolveConfiguredRoute(path)
  assert.equal(route.file, path)
  assert.equal(route.status, 200)
}
assert.equal((await resolveConfiguredRoute('/assets/arquivo-inexistente.js')).status, 404)
console.log(`${checks.length} rotas: metadados e assets do build válidos; regras locais de 404 e arquivos estáticos conferidas. Não substitui teste na Vercel.`)
