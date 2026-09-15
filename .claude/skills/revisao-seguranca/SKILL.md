---
name: revisao-seguranca
description: >-
  Revisão de segurança do DocLimpo sobre o código que acabou de mudar. Use ao
  finalizar a escrita de qualquer código, antes de considerar a tarefa pronta,
  ou quando o usuário pedir "revisão de segurança", "security review", "auditar
  segurança". Confere o diff contra as 8 regras de docs/SEGURANCA.md.
---

# Revisão de segurança — DocLimpo

Objetivo: garantir que nenhum código sai desta sessão sem passar pelo filtro de
segurança. Rode isto ao terminar de escrever código.

## Passos

1. **Leia as regras.** Abra `docs/SEGURANCA.md` (as 8 regras de ouro). É o
   critério da revisão.

2. **Pegue o que mudou.**
   ```bash
   git diff --stat && git status --porcelain
   ```
   Inclua arquivos novos (untracked) em `src/`, `supabase/functions/`,
   `supabase/migrations/`. Sem mudança de código relevante, informe e pare.

3. **Revise.**
   - Diff pequeno (1–3 arquivos): revise inline seguindo o checklist abaixo.
   - Diff grande ou muitos arquivos: delegue ao subagente `guardiao-seguranca`
     (via Agent), que devolve os achados compactados.

4. **Checklist** (resumo de docs/SEGURANCA.md — o detalhe está lá):
   - Tabela nova → RLS + políticas por `auth.uid()` na mesma migration.
   - Edge Function com service role → autentica chamador e deriva id do token (IDOR).
   - Entrada validada com `zod` + `CHECK` no banco + `maxLength` no input.
   - Dado do usuário em HTML/e-mail → `escapeHtml`; sem `dangerouslySetInnerHTML`.
   - Segredo só no servidor; no front só `VITE_`; nada de segredo no git.
   - Rota que custa/pública → rate-limit; segredo comparado com `compararSegredo`.
   - Terceiro → host fixo, sem montar URL com input do usuário (SSRF), mínimo de dado.
   - Host externo novo → adicionado à CSP em `vercel.json`; CORS restrito.

5. **Reporte** os achados por severidade (mais grave primeiro), uma linha cada:
   `path:line: <severidade>: <problema>. <correção>.` Sem elogio, sem item fora
   de segurança. Se limpo: `Nenhum achado de segurança.`

6. **Provas finais.** Lembre de rodar antes do commit:
   ```bash
   npm run build && npm run lint && npm test && npm audit
   ```

Read-only por padrão: aponte as correções. Só aplique se o usuário pedir.
