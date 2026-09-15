# DocLimpo — páginas públicas Bezel

## Rotas e navegação

- `/`: landing com CTAs, três casos de uso ilustrativos e cinco perguntas frequentes.
- `/cadastro`: abre diretamente a criação de conta; `/login` permanece para entrar.
- `/cadastro?documento=cnh`, `passaporte` ou `seguro`: preservam o tipo no agradecimento, login e onboarding. Somente tipos conhecidos são aceitos; e-mail, token e destinos arbitrários não são propagados.
- `/obrigado`: confirmação pendente, sessão ativa ou acesso direto sem alegação de sucesso.
- `/privacidade`: minuta pública para revisão, com dados do fluxo atual e lacunas sinalizadas; `noindex` enquanto incompleta.
- Qualquer rota desconhecida: 404 Bezel com retorno ao início e ao painel.
- Âncoras: `/#como-funciona`, `/#casos`, `/#gratuito`, `/#perguntas`, `/#atendimento`.

## Pendências antes de publicar

1. Confirmar e-mail monitorado e prazo real de primeira resposta em `src/lib/public-content.ts` (`support`). Sem os dois, a interface não faz promessa de SLA.
2. Confirmar nome/razão social do controlador, canal de privacidade, bases legais, retenção/backups e condições dos prestadores. Revisar a minuta em `src/pages/Privacy.tsx` antes de retirar o aviso e alterar seu `noindex`.
3. Substituir cenários ilustrativos por cases de clientes apenas com autorização e evidências. A versão atual não usa clientes, depoimentos ou métricas inventadas.
4. Revisar o domínio canônico em `src/lib/page-meta.ts` caso o endereço oficial mude. Mantido o domínio já presente no projeto.
5. Validar em ambiente autorizado login/cadastro e envio de e-mail reais. Não houve criação de conta, envio ou alteração remota nesta entrega.

## Verificação local

Sem dependências novas. Runtime utilizado: Node 24.

```sh
npm run lint
npm test
npm run build
npm run test:build
npm run dev -- --host 127.0.0.1 --port 4174 --strictPort
```

Os testes de renderização usam React no servidor e substituem o cliente Supabase por um bloqueio explícito de acesso. Os testes do fluxo usam respostas simuladas; não são testes end-to-end de navegador.

O build gera HTML com title/description/OG/canonical por rota, além do ajuste no cliente durante navegação. Isso não é pré-renderização do conteúdo integral das páginas. As rotas privadas, o agradecimento, a política em revisão e a 404 usam `noindex`.

`vercel.json` contém regras locais para servir esses arquivos e retornar HTTP 404 nos endereços desconhecidos, preservando assets e rotas privadas. A checagem do build valida arquivos e regras, não o comportamento remoto da Vercel. O Vite de desenvolvimento mantém seu fallback HTTP 200; a página React ainda mostra a 404.

Não foram realizados QA visual em navegador, deploy, push, alterações de schema, Edge Functions ou configuração remota do Supabase.
