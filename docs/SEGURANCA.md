# Segurança do DocLimpo — regras de ouro

Guia _secure-by-default_ para qualquer feature nova. A ideia: mesmo implementando algo
inédito, se você seguir estas regras, o ataque não encontra porta. Vale para código deste
repo e para o que for adicionado depois.

## Modelo mental

O que protegemos: dados pessoais (nome, e-mail, **endereço residencial**, documentos e prazos),
contas e o dinheiro (assinaturas). De quem: usuários autenticados mal-intencionados (tentando
ler/alterar dados de outros — IDOR), abuso de recursos que custam (e-mail, pagamento), injeção,
e sites/atacantes externos.

A barreira principal **não é o app** — é o **RLS do Postgres**. O front e as Edge Functions são
conveniência; quem realmente decide quem vê o quê é o banco.

## As 8 regras

1. **RLS-first.** Toda tabela nova nasce, na mesma migration, com
   `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + uma política explícita por operação
   (SELECT/INSERT/UPDATE/DELETE) usando `auth.uid()`. Nunca confie no app para escopar dados.
   Padrão a copiar: `supabase/migrations/20260310220837_*.sql`.

2. **Service role = autorização na mão.** Toda Edge Function que usa `SUPABASE_SERVICE_ROLE_KEY`
   ignora o RLS — então precisa: (a) autenticar o chamador com `auth.getUser()`; e
   (b) derivar o id-alvo **do token**, nunca do corpo do request. Todo id vindo do cliente é
   validado contra o dono. Exemplos certos: `delete-account` e `cancelar-assinatura`
   (a assinatura a cancelar vem do banco pelo id do token, não do que o cliente manda).

3. **Valide na borda.** Todo corpo de request e todo formulário passa por um schema `zod`
   (`src/lib/validacao.ts`) — tipos, tamanhos, enums. E **espelhe no banco** com `CHECK`
   (`supabase/migrations/20260911120000_seguranca_constraints.sql`). O banco é a autoridade;
   o cliente é UX.

4. **Encode na saída.** Todo dado do usuário colocado em HTML/e-mail passa por `escapeHtml`
   (`supabase/functions/_shared/html.ts`). No front, nunca use `dangerouslySetInnerHTML` com
   dado do usuário (o React já escapa por padrão — mantenha assim).

5. **Segredos só no servidor.** `service_role`, `CAKTO_CLIENT_SECRET`, `CAKTO_WEBHOOK_SECRET`, `RESEND_API_KEY`,
   `CRON_SECRET` só nas variáveis das Edge Functions. No front, **apenas** valores `VITE_`
   (a anon key é pública por design — o RLS é o que protege). `.env` fica no `.gitignore`.
   Na menor suspeita de vazamento, **rotacione a chave**.

6. **Menor privilégio + rate-limit.** Toda rota que custa (e-mail/SMS/IA/pagamento) ou é
   pública tem limite por usuário/IP. Modelo: o teto de 1/min em `send-test-notification`.
   Compare segredos com `compararSegredo` (`_shared/seguranca.ts`), nunca com `!==`.

7. **Terceiros com desconfiança (anti-SSRF).** Chamada externa só para host fixo em allowlist;
   **nunca** monte a URL a partir de input do usuário. Envie o mínimo necessário
   (ex.: só o CEP ao ViaCEP; o endereço nunca vai a serviço de mapa — a distância é local).

8. **CSP apertada.** A CSP (em `vercel.json`) lista os hosts permitidos. Ao integrar um host
   externo novo, **adicione-o explicitamente** à diretiva certa (`connect-src`/`script-src`/…),
   nunca afrouxe para `*`. `frame-ancestors 'none'` + `X-Frame-Options: DENY` barram clickjacking.

9. **Plano e cobrança só pelo servidor.** `profiles.plan_type`, `subscriptions` e `payments`
   são escritos apenas por `cakto-webhook` (HMAC de `X-Cakto-Signature` verificado com janela de
   5 min, idempotente por evento + pedido em `cakto_events`) e `cancelar-assinatura`; a trigger
   `protect_billing_columns` recusa `plan_type` vindo de `authenticated`/`anon`, e as duas
   tabelas de cobrança só têm política de SELECT. O estado da assinatura vem da API da Cakto,
   nunca do nome do evento. O cliente nunca escolhe oferta nem preço — manda só o slug do
   plano, e `cakto-checkout` resolve a oferta pelas variáveis `CAKTO_OFFER_*`; o vínculo com o
   usuário é um token opaco (`cakto_checkouts`) no `?callback=`, nunca e-mail ou id. O front só
   segue para `https://pay.cakto.com.br` (`urlCheckoutSegura`). Reembolso e chargeback cancelam
   a assinatura e encerram o acesso na hora; o cancelamento pela conta mantém o plano até o fim
   do mês pago por `subscriptions.acesso_ate`, que só o servidor grava. Excluir a conta cancela a
   cobrança antes de apagar qualquer dado. O limite de
   documentos é decidido por `enforce_plan_limits` (banco) a partir de `plano_efetivo()`; o gate
   do front (`podeAdicionarDocumento`) é só experiência. Convites de família
   guardam só o hash do token; o token vai apenas no e-mail e expira em 7 dias.

## Antes de abrir um PR

- `npm run build` · `npm run lint` · `npm test` verdes.
- Tabela nova? RLS + políticas na mesma migration.
- Function nova com service role? Checou `auth.getUser()` e derivou o id do token?
- Entrou dado do usuário em HTML/e-mail? Passou por `escapeHtml`?
- Segredo novo? Está fora do front e fora do git?
- Host externo novo? Entrou na CSP e é chamado sem montar URL com input do usuário?

## Pendências de infraestrutura (fora do código — exigem o painel/produção)

- Rodar os _security advisors_ do Supabase e tratar o que aparecer.
- Ativar proteção contra senha vazada (HIBP), força mínima de senha e considerar MFA.
- Confirmar confirmação de e-mail no cadastro e os rate-limits de auth.
- CI com `npm audit` + varredura de segredos (ex.: gitleaks) + testes a cada PR.
- Suíte automatizada de RLS/authz (provar que o usuário A não lê/escreve dados de B).
- Aplicar as migrations no projeto **vivo** de produção (`hkdlthvyhvnlfojwqnxc`).
