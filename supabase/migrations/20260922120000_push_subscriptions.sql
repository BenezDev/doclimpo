-- Assinaturas de Web Push (uma por dispositivo/navegador). O usuário cria e
-- remove as próprias pelo RLS; o envio (service role) só faz POST para os
-- serviços de push da allowlist do CHECK — mesma regex em
-- supabase/functions/_shared/notificacoes.ts e src/lib/push.ts (anti-SSRF).
--
-- Rollback: DROP TABLE public.push_subscriptions;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE
    CHECK (
      char_length(endpoint) <= 1024
      AND endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
    ),
  p256dh text NOT NULL CHECK (char_length(p256dh) BETWEEN 80 AND 100),
  auth text NOT NULL CHECK (char_length(auth) BETWEEN 20 AND 30),
  user_agent text CHECK (user_agent IS NULL OR char_length(user_agent) <= 200),
  criado_em timestamptz NOT NULL DEFAULT now(),
  ultimo_uso_em timestamptz
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_usuario ON public.push_subscriptions (usuario_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push: ver as proprias" ON public.push_subscriptions;
CREATE POLICY "push: ver as proprias" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "push: criar as proprias" ON public.push_subscriptions;
CREATE POLICY "push: criar as proprias" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "push: atualizar as proprias" ON public.push_subscriptions;
CREATE POLICY "push: atualizar as proprias" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "push: remover as proprias" ON public.push_subscriptions;
CREATE POLICY "push: remover as proprias" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = usuario_id);
