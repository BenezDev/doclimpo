// Pré-renderiza o conteúdo das páginas públicas indexáveis dentro de
// <div id="root"> em dist/, depois do `vite build`. Robôs de busca e prévias
// de link passam a ler o texto da página sem executar JavaScript. No
// navegador, `createRoot` (src/main.tsx) substitui esse HTML pela aplicação.
//
// Mesmo arranjo do tests/render-pages.test.mjs: Vite em modo SSR, cliente do
// Supabase bloqueado e visitante sem sessão.

import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const dist = new URL('../dist/', import.meta.url)

const server = await createServer({
  configFile: false,
  logLevel: 'error',
  cacheDir: fileURLToPath(new URL('../node_modules/.vite-prerender', import.meta.url)),
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, watch: null },
  appType: 'custom',
  plugins: [{
    name: 'block-backend-in-prerender',
    enforce: 'pre',
    resolveId(id) { if (id.includes('integrations/supabase/client')) return '\0prerender-auth-client' },
    load(id) { if (id === '\0prerender-auth-client') return 'export const supabase = new Proxy({}, { get() { throw new Error("Backend access forbidden in prerender") } })' },
  }],
})

try {
  const { AuthContext } = await server.ssrLoadModule('/src/context/auth-context.ts')
  const { DOCUMENTOS_PUBLICOS } = await server.ssrLoadModule('/src/lib/documentos-publicos.ts')

  const paginas = [
    { path: '/', pattern: '/', modulo: 'Landing_1' },
    { path: '/documentos', pattern: '/documentos', modulo: 'DocumentosHub' },
    { path: '/sobre', pattern: '/sobre', modulo: 'Sobre' },
    { path: '/seguranca', pattern: '/seguranca', modulo: 'Seguranca' },
    ...DOCUMENTOS_PUBLICOS.map(item => ({ path: `/documentos/${item.slug}`, pattern: '/documentos/:tipo', modulo: 'DocumentoPublico' })),
  ]

  for (const pagina of paginas) {
    const { default: Page } = await server.ssrLoadModule(`/src/pages/${pagina.modulo}.tsx`)
    const markup = renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [pagina.path] },
      createElement(AuthContext.Provider, { value: { user: null, loading: false, session: null, signOut: async () => {} } },
        createElement(Routes, null, createElement(Route, { path: pagina.pattern, element: createElement(Page) })))))
    if (!markup.includes('<h1')) throw new Error(`Pré-render sem <h1> em ${pagina.path}`)

    const arquivo = new URL(pagina.path === '/' ? 'index.html' : `.${pagina.path}/index.html`, dist)
    const html = await readFile(arquivo, 'utf8')
    if (!html.includes('<div id="root"></div>')) throw new Error(`#root vazio não encontrado em ${fileURLToPath(arquivo)}`)
    await writeFile(arquivo, html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`))
  }
  console.log(`${paginas.length} páginas públicas pré-renderizadas.`)
} finally {
  await server.close()
}
