# Hospedagem na Cloudflare (Workers static assets)

O DocLimpo é um site estático: o `dist/` do Vite com as páginas públicas pré-renderizadas.
Não há função serverless; o backend é o Supabase (banco, Auth e Edge Functions), que não muda.
O plano grátis da Cloudflare permite uso comercial e não cobra por requisição de arquivo estático.

| Arquivo | Papel |
|---|---|
| `wrangler.jsonc` | Worker `doclimpo` só com static assets de `./dist`. `drop-trailing-slash`: `/cadastro/index.html` é servido em `/cadastro` e `/cadastro/` redireciona para `/cadastro`. O que não existe recebe `404.html` com status 404 |
| `public/_headers` | CSP e cabeçalhos de segurança (antes no `vercel.json`); `sw.js` sem cache |
| `public/_redirects` | 301 dos slugs antigos e a casca única de `/documento/<id>` |

Página pública nova não precisa de regra: basta a pasta com `index.html` no `dist/`.

Conferir localmente o mesmo roteamento da Cloudflare:

```bash
npm run build && npm run test:build
npm run preview:cloudflare   # http://localhost:8787
```

## Passo a passo no painel (feito por você)

Nada abaixo foi feito pelo repositório. Ordem pensada para não derrubar o site.

### 1. Cloudflare: criar o Worker a partir do GitHub

1. Crie a conta grátis em dash.cloudflare.com.
2. **Workers & Pages → Create → Import a repository** → autorize o GitHub e escolha `BenezDev/doclimpo`.
3. Configure o build:
   - Production branch: `main`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
4. **Settings → Variables and Secrets → Build**: crie as variáveis `VITE_*` do `.env.example`
   (as mesmas que estavam na Vercel: URL e chave publishable do Supabase etc.). São lidas no build.
5. Rode o primeiro deploy e abra a URL `doclimpo.<sua-conta>.workers.dev`.
   As páginas públicas devem abrir. Login e Edge Functions só funcionam no domínio final:
   o CORS das funções aceita só `APP_URL` (`https://www.doclimpo.com`).

### 2. Cloudflare: adicionar o domínio

1. **Add a domain** → `doclimpo.com` → plano **Free**.
2. A Cloudflare importa os registros DNS atuais. **Confira um por um** antes de seguir,
   principalmente os de e-mail: MX, SPF (`TXT v=spf1…`), DKIM e DMARC do Resend
   (`resend._domainkey`, `send`…). Sem eles, os alertas por e-mail param.
3. Apague os registros que apontam para a Vercel (`A 76.76.21.21`, `CNAME cname.vercel-dns.com`).
   Não crie novos para `www` e `@` à mão: o passo 4 cria.
4. Anote os dois nameservers que a Cloudflare mostrar (`xxx.ns.cloudflare.com`).

### 3. Hostinger: trocar os nameservers

1. hPanel → **Domínios** → `doclimpo.com` → **DNS / Nameservers** → **Alterar nameservers**.
2. Escolha "usar nameservers personalizados" e cole os dois da Cloudflare.
3. Espere o e-mail da Cloudflare dizendo que o domínio está ativo (minutos a 24 h).
   O domínio continua registrado e pago na Hostinger; só o DNS passa para a Cloudflare.

### 4. Cloudflare: ligar o domínio ao Worker

1. Worker `doclimpo` → **Settings → Domains & Routes → Add → Custom domain** → `www.doclimpo.com`.
2. Para o domínio sem `www`: **DNS → Add record** `A`, nome `@`, IPv4 `192.0.2.1`, **Proxied** (nuvem laranja).
   Depois **Rules → Redirect Rules → Create → template "Redirect from root to WWW"**
   (`https://doclimpo.com/*` → `https://www.doclimpo.com/${1}`, 301, preservando a query).
3. **SSL/TLS → Overview**: modo **Full (strict)**. **SSL/TLS → Edge Certificates**: "Always Use HTTPS" ligado.

### 5. Conferir

- `https://www.doclimpo.com/` abre, `https://doclimpo.com/` redireciona para `www`.
- Login, cadastro e a lista de documentos funcionam (Supabase Auth e Edge Functions).
- `https://www.doclimpo.com/documentos/plano_saude` → 301 para `/documentos/plano-de-saude`.
- Um alerta de teste por e-mail chega (registros do Resend preservados).
- Só depois disso, remova o projeto e o domínio na Vercel.

## Diferenças em relação à Vercel

- **Vercel Web Analytics saiu.** Só funciona hospedado na Vercel. A política de privacidade e o aviso de
  cookies foram atualizados. Se quiser métricas de novo, o Cloudflare Web Analytics é grátis e sem cookie,
  mas exige liberar `static.cloudflareinsights.com` (script) e `cloudflareinsights.com` (connect) na CSP e
  voltar a mencioná-lo na política de privacidade.
- `/cadastro/` com barra final redireciona (307) para `/cadastro`, a URL canônica do sitemap. Na Vercel as
  duas formas respondiam 200.
- `/404` responde 200 com a página de erro; qualquer endereço inexistente continua com 404.
