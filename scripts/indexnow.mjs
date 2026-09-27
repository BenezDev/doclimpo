// Avisa Bing, Yandex e outros buscadores do protocolo IndexNow de todas as
// páginas indexáveis (as mesmas do sitemap). Rodar depois de cada publicação
// que muda páginas públicas:
//   node scripts/indexnow.mjs
// A chave não é segredo: o protocolo exige que ela fique pública em
// https://www.doclimpo.com/<chave>.txt para provar que o site é nosso.

import { readdir } from 'node:fs/promises'
import { publicPages, siteOrigin } from '../src/lib/page-meta.ts'

const publico = new URL('../public/', import.meta.url)
const arquivoChave = (await readdir(publico)).find(nome => /^[0-9a-f]{32}\.txt$/.test(nome))
if (!arquivoChave) throw new Error('Chave IndexNow não encontrada em public/<32 hex>.txt')
const chave = arquivoChave.slice(0, -4)

const urlList = Object.values(publicPages).filter(pagina => pagina.index).map(pagina => `${siteOrigin}${pagina.path}`)
const resposta = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(siteOrigin).host, key: chave, keyLocation: `${siteOrigin}/${arquivoChave}`, urlList }),
})
console.log(`IndexNow: ${resposta.status} ${resposta.statusText} para ${urlList.length} páginas.`)
if (!resposta.ok && resposta.status !== 202) process.exitCode = 1
