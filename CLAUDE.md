# DocLimpo

SaaS brasileiro de alertas de vencimento de documentos (CNH, CRLV, IPVA, passaporte…).
O usuário cadastra documentos com data de vencimento e recebe avisos antes de vencer.

## ⚠️ Leia isto antes de mexer

**Este repositório não é o que está em produção.** O app em
`https://docalert-three.vercel.app` roda uma versão mais avançada — com Stripe,
Resend, 8 rotas e tela de conta — cuja fonte não está neste repo nem no disco.
O deploy foi feito por CLI, sem vínculo git.

Antes de investir em qualquer refatoração grande, descubra de onde a Vercel faz
deploy. Diagnóstico completo no vault Obsidian `~/Documentos/DocAlertV2`.

Há três projetos Supabase envolvidos:

| Ref | Onde | Situação |
|---|---|---|
| `powthshacxtxqfsuifeb` | `config.toml` deste repo | morto (NXDOMAIN) — o `.env` local já NÃO aponta mais para ele |
| `hwsuqxwonfhjtyxervqh` | conta Supabase conectada ao Claude | ativo, não é do DocLimpo (serve só como staging) |
| `hkdlthvyhvnlfojwqnxc` | bundle de produção **e o `.env` local (desde 14/09/2026)** | vivo, com dados reais — contas criadas em dev entram aqui |

## Stack

React 19 · Vite 8 · TypeScript 6 (strict) · react-router 7 · Supabase JS 2

Estilização é **inline** (`style={{}}`). Tailwind 4 está instalado e importado em
`index.css`, mas nenhuma tela usa `className` com utilitários. Se for adotar
Tailwind de verdade, note que a v4 configura por CSS — não existe
`tailwind.config.js`.

## Estrutura

```
src/
  pages/          Landing_1 · Login (com recuperação de senha) · RedefinirSenha · Onboarding ·
                  Dashboard · DocumentoDetalhe · Conta · Privacy · Termos · ThankYou · NotFound
  components/ui/  AddDocumentModal · EnderecoModal · OndeRenovar · CookieConsent · PublicShell · Bezel
  context/        auth-context.ts (contexto) · AuthContext.tsx (provider)
  hooks/          useAuth
  lib/            erros.ts (tradução de erros do banco)
  integrations/supabase/  client.ts (único client, tipado) · types.ts
supabase/
  migrations/     8 migrations
  functions/      10 Edge Functions Deno
```

`AuthContext.tsx` só exporta o provider e `hooks/useAuth.ts` só o hook — separados
de propósito, senão o fast refresh do Vite quebra.

## Banco

9 tabelas, todas com RLS habilitado e políticas por `auth.uid()`. **O RLS é a
parte mais confiável do projeto** — verificado ativo em produção.

Pontos a saber:

- `profiles` casa com o auth por **`user_id`**, não por `id`. Em produção a coluna
  `id` nem existe.
- `documentos` tem duas noções concorrentes de estado: `resolvido` (boolean, usado
  pelo frontend) e `status` (texto, escrito só pelo cron e lido por ninguém).
- Um trigger `enforce_free_plan_document_limit` levanta `PLAN_LIMIT` ao inserir o
  segundo documento de um usuário FREE. Trate esse erro no frontend com
  `interpretarErro()` de `lib/erros.ts` — é o principal gate de conversão.
- `subscriptions` e `payments` não são escritas por nada: falta o webhook do Stripe.

## Alertas

```
pg_cron 09:00 BRT → check-expiring-documents → enfileira em notifications
pg_cron a cada hora → send-pending-notifications → envia via Resend
```

Janelas: **90 / 30 / 7 / 1** dias. Se mudar, alinhe os três lugares que prometem
prazos ao usuário: landing, onboarding e tela de detalhe.

`check-expiring-documents` e `send-pending-notifications` exigem o header
`x-cron-secret`. As demais validam JWT manualmente via `auth.getUser()` — o
`verify_jwt = false` no `config.toml` é compensado no código.

## Planos e limites

FREE = 1 documento ativo · INDIVIDUAL R$ 9,90 · MEI R$ 19,89 (+ tipos `alvara`, `certidao`,
`das_mei`) · FAMILIAR R$ 29,89 (até 4 pessoas, cada uma com conta própria; convite por e-mail).
Catálogo em `src/lib/planos.ts`; verdade do plano em `profiles.plan_type` (escrita só pelo
servidor) e `plano_efetivo()` no banco (migration `20260915120000_planos_e_familia.sql`), que
inclui o plano herdado da família. O front chama `rpc('meu_plano')` e cai em `plan_type` se a
função não existir. Ao bater o limite, `PlanosModal` abre na hora (Dashboard, AddDocumentModal e
Onboarding). Stripe: `create-checkout` (`{ plano }`), `customer-portal`, `check-subscription`,
`stripe-webhook`; família: `convidar-familiar`, `aceitar-convite`. Regra 9 em `docs/SEGURANCA.md`.

## Páginas legais e suporte

`src/lib/public-content.ts` → `support` é o único interruptor de publicação: enquanto
`controller` ou `email` forem `null`, a landing mostra "prazo em definição" e `/privacidade`
e `/termos` exibem o aviso de minuta. Preencha com dados reais antes de lançar; nunca com
placeholders. A recuperação de senha exige `<APP_URL>/redefinir-senha` na lista de Redirect
URLs do painel do Supabase (Authentication → URL Configuration).

## Variáveis

Frontend em `.env` (ver `.env.example`). Segredos das Edge Functions vão no painel
do Supabase, nunca no repo. O `.env` já foi versionado por engano no passado —
não reintroduza.

Antes de aplicar `20260816123000_agendar_cron_alertas.sql`, cadastre no Vault:

```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<segredo forte>',           'cron_secret');
```

## Comandos

```bash
npm run dev      # servidor local
npm run build    # tsc -b && vite build — deve passar limpo
npm run lint     # eslint — deve passar limpo
```

## Armadilha conhecida

`data_vencimento` vem do Postgres como `YYYY-MM-DD`. Passar direto para
`new Date()` quebra por fuso horário em produção. Use o parse por partes:

```ts
const [ano, mes, dia] = data.split('-')
new Date(Number(ano), Number(mes) - 1, Number(dia))
```

Já foi corrigido uma vez e a correção mal aplicada deixou código órfão que quebrou
o build por meses. Não reintroduza.
