#!/usr/bin/env bash
# Hook PostToolUse (Edit|Write|MultiEdit) do DocLimpo.
# Ao alterar código (src/, supabase/functions/, supabase/migrations/), injeta
# UMA vez por sessão um lembrete para rodar a revisão de segurança antes de
# finalizar. Non-blocking: só adiciona contexto, nunca bloqueia a edição.
# Fail-safe: qualquer erro de parsing resulta em silêncio (nunca spam).

payload="$(cat)"

parsed="$(printf '%s' "$payload" | python3 -c 'import json,sys
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
sid = d.get("session_id", "") or "fallback"
fp = (d.get("tool_input") or {}).get("file_path", "")
print(sid + "\t" + fp)' 2>/dev/null || printf 'fallback\t')"

IFS=$'\t' read -r session file <<< "$parsed"

# Só código do produto dispara o lembrete.
case "$file" in
  */src/*|*/supabase/functions/*|*/supabase/migrations/*) ;;
  *) exit 0 ;;
esac

dir="${TMPDIR:-/tmp}"
marker="$dir/doclimpo-sec-${session}"
[ -e "$marker" ] && exit 0
touch "$marker" 2>/dev/null || true

cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Guardião de segurança: você alterou código nesta sessão. Antes de considerar a tarefa concluída, rode a revisão de segurança — skill /revisao-seguranca ou o subagente guardiao-seguranca — conferindo o diff contra as 8 regras de docs/SEGURANCA.md (RLS, service role/authz, validação, escape na saída, segredos, rate-limit, SSRF, CSP). Este lembrete aparece uma vez por sessão."}}
JSON
exit 0
