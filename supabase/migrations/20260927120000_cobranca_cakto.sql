-- Cobrança recorrente pela Cakto no lugar do Stripe.
--
-- Em produção o Stripe nunca cobrou ninguém (0 assinaturas, 0 pagamentos, 0
-- customers em 22/09/2026), então as colunas são renomeadas em vez de deixar
-- colunas mortas ao lado das novas.
--
--   1. subscriptions/payments: ids da Cakto, com UNIQUE de verdade (o índice
--      parcial anterior não serve de alvo para o upsert do PostgREST).
--   2. subscriptions/payments só são escritas pelo servidor: saem as políticas
--      de INSERT/UPDATE do usuário (ficam só as de SELECT).
--   3. profiles.stripe_customer_id sai: o vínculo usuário ↔ Cakto é a assinatura
--      (subscriptions.cakto_subscription_id) e o token do checkout.
--   4. cakto_checkouts: token opaco que vai no ?callback= do link e volta no
--      webhook — é por ele que a primeira venda chega ao usuário certo.
--   5. stripe_events vira cakto_events (idempotência do webhook).

-- 1. Ids da Cakto
ALTER TABLE public.subscriptions RENAME COLUMN stripe_subscription_id TO cakto_subscription_id;
DROP INDEX IF EXISTS public.subscriptions_stripe_subscription_id_unico;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_cakto_subscription_id_key UNIQUE (cakto_subscription_id);

ALTER TABLE public.payments RENAME COLUMN stripe_payment_id TO cakto_order_id;
DROP INDEX IF EXISTS public.payments_stripe_payment_id_unico;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_cakto_order_id_key UNIQUE (cakto_order_id);

-- 2. Escrita só pelo servidor (webhook e cancelar-assinatura usam service role)
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;

-- 3. Sem customer do Stripe; plan_type continua só do servidor
CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() IN ('authenticated', 'anon') AND NEW.plan_type IS DISTINCT FROM OLD.plan_type THEN
    RAISE EXCEPTION 'BILLING_READONLY';
  END IF;
  RETURN NEW;
END;
$$;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS stripe_customer_id;

-- 4. Sessões de checkout
CREATE TABLE IF NOT EXISTS public.cakto_checkouts (
  token text PRIMARY KEY CHECK (token ~ '^[A-Za-z0-9._~-]{16,255}$'),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plano text NOT NULL CHECK (plano IN ('individual', 'familia', 'mei')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cakto_checkouts_usuario_plano_idx ON public.cakto_checkouts (usuario_id, plano, criado_em DESC);
ALTER TABLE public.cakto_checkouts ENABLE ROW LEVEL SECURITY; -- sem políticas: só service role

-- 5. Idempotência do webhook: chave = "<evento>:<id do pedido>"
ALTER TABLE public.stripe_events RENAME TO cakto_events;
ALTER TABLE public.cakto_events RENAME CONSTRAINT stripe_events_pkey TO cakto_events_pkey;
