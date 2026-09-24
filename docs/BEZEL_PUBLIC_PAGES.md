# DocLimpo — páginas públicas

## Rotas e navegação

- `/`: landing "amigo do motorista". Seções: abertura com celular ilustrado e placa,
  faixa dos canais oficiais, "Esquecer a data sai caro" (`#custo`, fatos do CTB em
  `src/data/custo-de-esquecer.ts`), como funciona, recursos, privacidade, planos (`#planos`,
  `#gratuito`), perguntas (`#perguntas`, 8 itens de `src/lib/public-content.ts`) e chamada final.
  Estilos em `src/styles/landing.css`, importado em `App.tsx`.
- `/sobre` (com `#contato`) e `/seguranca`: indexáveis, conteúdo estático.
- `/documentos` e `/documentos/<slug>`: guias por documento (`src/lib/documentos-publicos.ts`).
  Slug com hífen; o tipo do banco fica em `tipo`. Slugs antigos com underline têm 301.
- `/cadastro`, `/login`, `/obrigado`, `/privacidade`, `/termos`, 404: como antes.
- Intenções: `?documento=<tipo>` e `?plano=<slug>` passam por cadastro, login, agradecimento,
  onboarding e painel (`withIntent`). Qualquer outro parâmetro é descartado.
- Rodapé comum (`SiteFooter`) na landing e no `PublicShell`. Razão social e CNPJ só aparecem
  com `support.cnpj` preenchido.

## Busca

- `build/page-html.ts`: title, description, OG, canonical, robots e JSON-LD por rota; sitemap
  com `lastmod` e robots.
- `scripts/prerender.mjs` (último passo do `npm run build`): HTML das páginas indexáveis dentro
  de `#root`. No navegador, `createRoot` substitui esse HTML pela aplicação.
- Depois de publicar: Search Console e Bing Webmaster (verificação por TXT no DNS da Hostinger)
  e envio do `sitemap.xml`.

## Pendências

1. Trocar `support.email` para `contato@doclimpo.com` quando o redirecionamento existir na Hostinger.
2. Preencher `support.cnpj` quando o MEI sair.
3. Depoimentos só de clientes reais, com autorização.

## Verificação local

```sh
npm run lint
npm test
npm run build
npm run test:build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Os testes de renderização usam React no servidor e bloqueiam o cliente Supabase. A checagem do
build valida arquivos, HTML pré-renderizado, JSON-LD e regras locais do `vercel.json`, não o
comportamento remoto da Vercel.
