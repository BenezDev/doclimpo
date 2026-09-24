import type { Plugin } from 'vite'
import { getPageMeta, publicPages, siteOrigin, structuredData } from '../src/lib/page-meta.ts'

export function renderPageHead(html: string, path: string) {
  const meta = getPageMeta(path)
  const escape = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
  let result = html.replace(/<title>[^<]*<\/title>/, `<title>${escape(meta.title)}</title>`)
  const fields = [
    ['name', 'description', meta.description], ['name', 'robots', meta.index ? 'index,follow' : 'noindex,follow'],
    ['property', 'og:title', meta.title], ['property', 'og:description', meta.description], ['property', 'og:url', `${siteOrigin}${meta.path}`],
    ['name', 'twitter:title', meta.title], ['name', 'twitter:description', meta.description],
  ]
  for (const [attribute, name, value] of fields) {
    const tag = `<meta ${attribute}="${name}" content="${escape(value)}" />`
    const pattern = new RegExp(`<meta ${attribute}="${name}"[^>]*>`)
    result = pattern.test(result) ? result.replace(pattern, tag) : result.replace('</head>', `  ${tag}\n  </head>`)
  }
  const canonical = `<link rel="canonical" href="${siteOrigin}${meta.path}" />`
  result = /<link rel="canonical"[^>]*>/.test(result) ? result.replace(/<link rel="canonical"[^>]*>/, canonical) : result.replace('</head>', `  ${canonical}\n  </head>`)
  // JSON-LD: "<" vira \u003c para nenhum texto fechar o <script> antes da hora.
  result = result.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
  const blocos = structuredData(path).map(dado => `<script type="application/ld+json">${JSON.stringify(dado).replace(/</g, '\\u003c')}</script>`)
  return blocos.length ? result.replace('</head>', `  ${blocos.join('\n  ')}\n  </head>`) : result
}

// Só páginas indexáveis; as privadas e as de fluxo ficam de fora. `lastmod` é a
// data do build: toda publicação pode ter mudado o conteúdo das páginas.
export function renderSitemap(lastmod = new Date().toISOString().slice(0, 10)) {
  const urls = Object.values(publicPages).filter(page => page.index).map(page => `  <url><loc>${siteOrigin}${page.path}</loc><lastmod>${lastmod}</lastmod></url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

export function pageHtml(): Plugin {
  return {
    name: 'docalert-page-html',
    transformIndexHtml: { order: 'post', handler: (html, context) => {
      const path = (context.originalUrl ?? context.path).split('?')[0]
      return renderPageHead(html, path === '/index.html' ? '/' : path)
    } },
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
        const index = bundle['index.html']
        if (!index || index.type !== 'asset') return
        const html = String(index.source)
        for (const path of Object.keys(publicPages).filter(path => path !== '/')) {
          this.emitFile({ type: 'asset', fileName: path === '/404' ? '404.html' : `${path.slice(1)}/index.html`, source: renderPageHead(html, path) })
        }
        this.emitFile({ type: 'asset', fileName: 'documento/index.html', source: renderPageHead(html, '/documento/private') })
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap() })
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /conta\nDisallow: /documento/\nDisallow: /onboarding\nSitemap: ${siteOrigin}/sitemap.xml\n` })
      },
    },
  }
}
