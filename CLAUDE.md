# DocLimpo

SaaS brasileiro de alertas de vencimento de documentos (CNH, CRLV, IPVA, passaporte…).
O usuário cadastra documentos com data de vencimento e recebe avisos antes de vencer.

## ⚠️ Leia isto antes de mexer

**Produção atual:** repo `BenezDev/doclimpo` (branch `main`) → Vercel `www.doclimpo.com` (alias `doclimpo.vercel.app`)
→ Supabase `zgpixmunvgnwgzzfwpjg`. Deploy é por git: push na `main` publica.

`https://docalert-three.vercel.app` é o app antigo (DocAlert), deployado por CLI sem
vínculo git e apontando para um Supabase de outra conta. Está sendo substituído; não
invista nele. Histórico do diagnóstico no vault Obsidian `~/Documentos/DocAlertV2`.

Projetos Supabase:

| Ref | Onde | Situação |
|---|---|---|
| `zgpixmunvgnwgzzfwpjg` | **`.env` local e `config.toml` (desde 15/09/2026)**, sa-east-1, conta do João | **o banco do DocLimpo**: migrations aplicadas, 10 Edge Functions no ar, cron agendado, Vault com `project_url`/`cron_secret` |
| `hkdlthvyhvnlfojwqnxc` | bundle antigo em `docalert-three.vercel.app` | de outra conta, sem acesso; 5 migrations atrás do código — não usar |
| `hwsuqxwonfhjtyxervqh` | mesma conta Supabase | outro projeto (`licenses`), não é do DocLimpo — não mexer |
| `powthshacxtxqfsuifeb` | histórico | morto (NXDOMAIN) |

## Stack

React 19 · Vite 8 · TypeScript 6 (strict) · react-router 7 · Supabase JS 2

Estilização por CSS próprio ("Bezel"): tokens e componentes em `src/index.css` (`bz-*`),
páginas públicas em `src/styles/public-pages.css` e `landing.css` (ambos importados em
`App.tsx`). Tailwind 4 está importado em `index.css` só para expor os tokens do `@theme`;
nenhuma tela usa utilitários.

## Marca

Tom "amigo do motorista": carro primeiro (CNH, licenciamento, IPVA, multa), outros
documentos como "e também". Símbolo = placa Mercosul com check verde (`BrandMark` em
`Bezel.tsx`; mesmo desenho em `public/favicon.svg` e nos PNGs). Títulos em **Onest**,
texto em **Inter**, servidas pelo próprio site (`@fontsource-variable`, importadas em `main.tsx`;
nada de Google Fonts), números com `tabular-nums` (sem fonte mono). Verde `#2fd97f` nos
botões, `#0a6b3e` em links, asfalto `#101614` nas faixas escuras, azul Mercosul só na
`Placa`. Nada de número de clientes, nota ou depoimento que não exista: prova vem de fonte
oficial com `verificadoEm` (ex.: `src/data/custo-de-esquecer.ts`, artigos do CTB).

Regras de trânsito citadas no site vêm do CTB compilado do Planalto (já com a Lei 15.428/2026:
renovação automática da CNH para quem está no RNPC, **com exame médico obrigatório**, art. 268-A,
§ 7º). O app federal se chama **CNH do Brasil** (antiga Carteira Digital de Trânsito). Links
oficiais mudam sem aviso: em 27/09/2026 três estavam em 404 e foram trocados; confira com curl
antes de publicar link novo.

## Estrutura

```
src/
  pages/          Landing_1 · Login (com recuperação de senha) · RedefinirSenha · Onboarding ·
                  Dashboard · DocumentoDetalhe · Conta · Privacy · Termos · ThankYou · NotFound ·
                  DocumentosHub e DocumentoPublico (/documentos/<slug>, SEO) · Sobre · Seguranca ·
                  GuiasHub e Guia (/guias/<slug>) · CalculadoraCnh e CalculadoraMulta (/calculadora/*)
  components/ui/  AddDocumentModal · EnderecoModal · OndeRenovar · OndeConsultarMultas · RenovarDialog ·
                  SugestaoData · VeiculoForm · CookieConsent · PublicShell · SiteFooter · Placa · Bezel
  context/        auth-context.ts (contexto) · AuthContext.tsx (provider)
  hooks/          useAuth · usePlano (rpc meu_plano com fallback em plan_type)
  lib/            datas.ts (parse por partes, dias, formatação) · erros.ts · planos.ts (catálogo,
                  canais, WHATSAPP_DISPONIVEL) · agenda.ts (.ics/Google Agenda) · cnh.ts ·
                  calendario-veicular.ts · multas.ts (prazos do CTB, links por UF) · veiculos.ts (placa) ·
                  push.ts · telefone.ts · documentos-publicos.ts · guias.ts (guias e calculadoras, com fonte)
  data/           calendario-veicular.ts (IPVA/licenciamento por UF e placa) · consulta-multas-uf.ts
                  (onde consultar multas por UF + SENATRAN/SNE) · custo-de-esquecer.ts (CTB) — só
                  fonte oficial, com `verificadoEm`
  integrations/supabase/  client.ts (único client, tipado) · types.ts
public/sw.js      service worker só de push (sem cache)
supabase/
  migrations/     migrations SQL (aplicadas em produção via MCP; arquivo espelha o que subiu)
  functions/      10 Edge Functions Deno; _shared/notificacoes.ts e _shared/cakto-eventos.ts são puros e testados em Node
  templates/      e-mails do Supabase Auth com a marca (colados no painel; ver README.md lá)
scripts/cakto-provisionar.mjs  cria produtos/ofertas/webhook na Cakto (chaves só no shell)
scripts/prerender.mjs          escreve o HTML das páginas públicas indexáveis em dist/ (roda no build)
scripts/indexnow.mjs           avisa Bing/Yandex das páginas indexáveis (rodar depois de publicar páginas públicas)
build/page-html.ts             title/description/OG/canonical/JSON-LD por rota, sitemap e robots
```

`AuthContext.tsx` só exporta o provider e `hooks/useAuth.ts` só o hook — separados
de propósito, senão o fast refresh do Vite quebra.

## Banco

10 tabelas, todas com RLS habilitado e políticas por `(select auth.uid())` (sempre dentro do
`select`: o Postgres calcula uma vez por consulta). Funções auxiliares SECURITY DEFINER usadas só
em políticas ficam no schema `private` (fora da API), como `private.familia_titular_de`. **O RLS é a
parte mais confiável do projeto** — verificado ativo em produção.

Pontos a saber:

- `profiles` casa com o auth por **`user_id`**, não por `id`. Em produção a coluna
  `id` nem existe.
- `documentos` tem duas noções concorrentes de estado: `resolvido` (boolean, usado
  pelo frontend) e `status` (texto, escrito só pelo cron e lido por ninguém).
- Um trigger `enforce_free_plan_document_limit` levanta `PLAN_LIMIT` ao inserir o
  segundo documento de um usuário FREE. Trate esse erro no frontend com
  `interpretarErro()` de `lib/erros.ts` — é o principal gate de conversão.
- `subscriptions` e `payments` só são escritas pelo servidor (`cakto-webhook`, `cancelar-assinatura`); o
  usuário só lê.
- `veiculos` (placa + UF + apelido, até 5 por usuário via trigger `VEICULO_LIMIT`) alimenta o card
  "Seu carro" do Dashboard e o painel "Meu veículo" da Conta. **O DocLimpo não consulta multas**:
  os links de `data/consulta-multas-uf.ts` são fixos por UF e a placa nunca entra em URL. Consulta
  automática (API paga, renavam, consentimento) é fase 2 — não está construída.
- Tipo `multa` (todos os planos): `SugestaoData` calcula o prazo mínimo do CTB (defesa/indicação
  +30 dias da notificação; recurso +30; desconto vem impresso), o detalhe troca `OndeRenovar` por
  `OndeConsultarMultas` e `RenovarDialog` vira "próximo prazo" (+30 dias). Vercel rotas em
  `vercel.json` são manuais: página pública nova exige entrada lá.

## Alertas

```
pg_cron 09:00 BRT → check-expiring-documents → uma linha em notifications por (documento, janela, canal)
pg_cron a cada hora → send-pending-notifications → EMAIL via Resend · PUSH via jsr:@negrel/webpush · WHATSAPP via Meta Cloud API
```

Canais: e-mail em todo plano; push e WhatsApp só nos pagos — o gate é no servidor
(`plano_efetivo`) tanto ao enfileirar quanto ao enviar. `notifications.detalhe` guarda o motivo
de SKIPPED/FAILED. Push: tabela `push_subscriptions` (allowlist de hosts no CHECK, em
`_shared/notificacoes.ts` e em `src/lib/push.ts` — os três devem ser idênticos), segredos
`VAPID_*`. WhatsApp: número verificado por código em `whatsapp-verificar`; colunas `whatsapp_*`
de `profiles` só mudam pelo servidor (trigger `protect_whatsapp_columns`); a interface e a cópia só
mostram o canal com `WHATSAPP_DISPONIVEL = true` em `src/lib/planos.ts`.

Janelas: **90 / 30 / 7 / 1** dias — `JANELAS_ALERTA` existe duas vezes, em `src/lib/planos.ts`
(ordem decrescente, para a cópia do site) e em `_shared/notificacoes.ts` (crescente, para a
rodada); `tests/canais.test.mjs` compara as duas, então mudar uma sem a outra quebra o teste. Se
mudar, alinhe também os lugares que prometem prazos ao usuário: landing, onboarding, tela de
detalhe, `.ics` e textos legais.

A rodada **não** casa a data exata de cada janela. `janelaDoDia()` devolve a janela mais apertada
que o documento já alcançou e que ele ainda não tinha ultrapassado quando foi cadastrado — esse
segundo teste é o que evita um documento cadastrado a três dias do vencimento receber 90, 30 e 7
de uma vez. Consequência de propósito: um dia de cron perdido **atrasa** o aviso em vez de
perdê-lo, porque a mesma janela segue vigente amanhã, e o índice único
`notifications_doc_janela_canal_unico` impede o aviso repetido. Não troque isso por um `.eq()` na
data: era assim antes e um dia de cron fora derrubava o aviso para sempre.

O texto do aviso usa os **dias reais** até o vencimento no momento do envio (`diasEntre`), não a
janela gravada em `days_before_expiry` — essa coluna serve só como chave de idempotência. Uma
linha que esperou na fila, ou cuja data o usuário corrigiu depois, continua dizendo a verdade.
`dataLocalBr()` resolve o dia no calendário brasileiro (UTC-3 fixo, sem horário de verão desde
2019): a função roda em UTC e sem isso um cadastro às 22:00 perderia um dia de antecedência.

Escala: a varredura pagina de 1000 em 1000 (limite do PostgREST — sem isso a rodada ignorava
documentos em silêncio) e enfileira com uma consulta de fila mais um `INSERT` em lote.
`send-pending-notifications` lê perfis e documentos do lote em duas consultas e envia com
paralelismo limitado (`ENVIOS_SIMULTANEOS`), para o lote caber na janela de execução sem estourar
o limite de envio do Resend. Próximo gargalo conhecido: um usuário com vários documentos no mesmo
dia recebe um e-mail por documento. Agrupar em digest é a correção, e muda o modelo de uma linha
de `notifications` por documento.

Renovação: `rpc('renovar_documento')` resolve a linha antiga e cria a nova (`renovado_de`);
alertas recomeçam porque o id é novo. O Dashboard mostra o histórico na aba Resolvidos.

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
Onboarding). Família: `convidar-familiar`, `aceitar-convite`. Regra 9 em `docs/SEGURANCA.md`.

## Cobrança (Cakto)

Assinatura mensal recorrente pela Cakto (checkout hospedado). Não existe "criar checkout" por API:
cada plano é um produto de assinatura cuja oferta padrão é o link `pay.cakto.com.br/<id>`
(`CAKTO_OFFER_*`). Fluxo:

```
cakto-checkout ({ plano }) → grava token opaco em cakto_checkouts → pay.cakto.com.br/<oferta>?callback=<token>
Cakto → cakto-webhook (HMAC X-Cakto-Signature) → usuário pelo callback ou pela assinatura já conhecida
     → GET /subscriptions/{id} na API → subscriptions + profiles.plan_type (+ payments por pedido)
```

- Estado vem da API, não do nome do evento. `active`/`trial`/`late` dão acesso; o resto rebaixa.
- A Cakto não tem portal do cliente nem troca de plano: a Conta tem "Cancelar assinatura"
  (`cancelar-assinatura`) e trocar de plano = cancelar + assinar de novo.
- Cancelar não cobra de novo, mas o plano segue até o fim do mês pago: `subscriptions.acesso_ate`
  (gravado por `aplicarAssinatura`, regra pura `acessoAposEncerrar`) e `plano_proprio()`/`plano_efetivo()`
  no banco, que comparam com `now()` — nenhum cron rebaixa.
- `refund`/`chargeback` cancelam a assinatura e encerram o acesso na hora (`acesso_ate` null);
  `delete-account` cancela a cobrança antes de apagar.
- Voltar ao app depois do pagamento depende do "redirect pós-pagamento" da Cakto, liberado pelo
  Compliance deles (`compliance@cakto.com.br`); a URL a cadastrar é
  `https://www.doclimpo.com/dashboard?checkout={{callback}}`. Sem ele, o comprador fica na tela da
  Cakto e o plano chega pelo webhook do mesmo jeito.
- Produtos, ofertas e webhook: `node scripts/cakto-provisionar.mjs [--confirmar]`. Regra 9 em
  `docs/SEGURANCA.md`.

## Páginas legais e suporte

`src/lib/public-content.ts` → `support` é o único interruptor de publicação: enquanto
`controller` ou `email` forem `null`, `/privacidade` e `/termos` exibem o aviso de minuta.
`support.cnpj` (null até o MEI existir) liga a linha "razão social · CNPJ" no rodapé, em
`/sobre` e no JSON-LD. Preencha com dados reais; nunca com placeholders.

Intenções de URL: só `?documento=<tipo>` e `?plano=<slug>` passam de uma tela a outra
(`withIntent`, allowlist). `?plano=` vindo de "Escolher <plano>" na landing abre o
`PlanosModal` no painel com o plano em destaque.

SEO: páginas indexáveis ganham HTML pré-renderizado (`scripts/prerender.mjs`) e JSON-LD
(`structuredData` em `page-meta.ts`). Por isso Landing, DocumentosHub, DocumentoPublico, Sobre
e Seguranca são importadas direto em `App.tsx`, não com `lazy`: com `lazy`, o React trocaria o
HTML pronto pela tela de carregamento. Slug público ≠ tipo do banco (`plano-de-saude` →
`plano_saude`); slug antigo tem 301 em `vercel.json`. Depois de publicar páginas públicas novas, rode
`node scripts/indexnow.mjs` (Bing/Yandex); o Google depende do Search Console.

Desempenho: o cliente do Supabase é carregado por `import()` dentro do `AuthProvider`, fora do
pacote inicial. Não importe `integrations/supabase/client` (nem framer-motion) em nada que as
páginas públicas carreguem direto; use nas páginas lazy. A recuperação de senha exige `<APP_URL>/redefinir-senha` na lista de Redirect
URLs do painel do Supabase (Authentication → URL Configuration).

## Variáveis

Frontend em `.env` (ver `.env.example`). Segredos das Edge Functions vão no painel
do Supabase, nunca no repo. `EMAIL_FROM` = `DocLimpo <alertas@doclimpo.com>` (o padrão do
código, em `_shared/email.ts`, é o mesmo); os três e-mails das funções usam `layoutEmail()`. O `.env` já foi versionado por engano no passado —
não reintroduza.

Antes de aplicar `20260816123000_agendar_cron_alertas.sql`, cadastre no Vault:

```sql
select vault.create_secret('https://<ref>.supabase.co', 'project_url');
select vault.create_secret('<segredo forte>',           'cron_secret');
```

## Comandos

```bash
npm run dev      # servidor local
npm run build    # tsc -b && vite build && prerender — deve passar limpo
npm test         # node:test (lógica, renderização SSR, fluxo público)
npm run test:build  # confere dist/: metadados, HTML pré-renderizado, JSON-LD, rotas e sitemap
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
