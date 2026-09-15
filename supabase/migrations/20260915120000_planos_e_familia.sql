-- Planos, família e limites — o banco é a autoridade (defesa em profundidade).
--
-- Contexto: em produção uma conta FREE cadastrou um 2º documento. A trigger
-- antiga (enforce_free_plan_document_limit) não estava aplicada lá e o front
-- não checava nada. Esta migration:
--   1. restringe profiles.plan_type aos quatro planos;
--   2. cria familias / familia_membros (plano Família: até 4 pessoas, cada uma
--      com a própria conta) com RLS;
--   3. define plano_efetivo(uid) — o próprio plano se pago, FAMILIAR se membro
--      ativo de uma família cujo titular paga, senão FREE — e meu_plano() para
--      o front consultar o MESMO cálculo;
--   4. substitui a trigger de limite por enforce_plan_limits, baseada em
--      plano_efetivo (assinatura cancelada rebaixa titular e membros de uma vez);
--   5. limita a família a 4 pessoas por trigger;
--   6. amplia documentos.tipo com os tipos empresariais do plano MEI;
--   7. cria stripe_events (idempotência do webhook) e índices únicos para os
--      upserts de subscriptions/payments.
-- Idempotente: pode ser reaplicada sem efeitos colaterais.

-- 1. plan_type restrito (NOT VALID: não quebra linhas legadas; vale para escritas novas)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_type_check
  CHECK (plan_type IN ('FREE', 'INDIVIDUAL', 'FAMILIAR', 'MEI')) NOT VALID;

-- 1b. Colunas de cobrança só mudam pelo servidor. A política de UPDATE de
-- profiles vale para a linha inteira, então sem isto qualquer usuário poderia
-- fazer `update profiles set plan_type = 'FAMILIAR'` pela API e pular o paywall.
-- service_role (webhook/check-subscription) e o SQL editor continuam livres.
CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() IN ('authenticated', 'anon')
     AND (NEW.plan_type IS DISTINCT FROM OLD.plan_type
          OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id) THEN
    RAISE EXCEPTION 'BILLING_READONLY';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_billing_columns_trigger ON public.profiles;
CREATE TRIGGER protect_billing_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_billing_columns();

-- 2. Família
CREATE TABLE IF NOT EXISTS public.familias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titular_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.familia_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  familia_id uuid NOT NULL REFERENCES public.familias(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'convidado' CHECK (status IN ('convidado', 'ativo')),
  -- Só o hash do token fica no banco; o token em si vai apenas no e-mail do convite.
  token_hash text,
  expira_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  aceito_em timestamptz,
  UNIQUE (familia_id, email)
);

-- Uma pessoa pertence a no máximo uma família.
CREATE UNIQUE INDEX IF NOT EXISTS familia_membros_user_id_unico
  ON public.familia_membros (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_familia_membros_familia ON public.familia_membros (familia_id);
CREATE INDEX IF NOT EXISTS idx_familia_membros_email ON public.familia_membros (lower(email));

ALTER TABLE public.familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.familia_membros ENABLE ROW LEVEL SECURITY;

-- Helpers SECURITY DEFINER: evitam recursão entre as políticas das duas tabelas.
CREATE OR REPLACE FUNCTION public.familia_titular_de(uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.familias WHERE titular_id = uid LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.familia_membro_de(uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT familia_id FROM public.familia_membros WHERE user_id = uid AND status = 'ativo' LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.familia_titular_de(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.familia_membro_de(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.familia_titular_de(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.familia_membro_de(uuid) TO authenticated, service_role;

-- familias: titular e membros ativos leem; ninguém do cliente escreve (só service role).
DROP POLICY IF EXISTS "familia visivel ao titular e membros" ON public.familias;
CREATE POLICY "familia visivel ao titular e membros"
  ON public.familias FOR SELECT
  USING (titular_id = auth.uid() OR id = public.familia_membro_de(auth.uid()));

-- familia_membros: titular vê e remove qualquer linha da sua família; membro vê
-- e remove só a própria (sair). Inserção/atualização só via Edge Function.
DROP POLICY IF EXISTS "membros visiveis ao titular e ao proprio" ON public.familia_membros;
CREATE POLICY "membros visiveis ao titular e ao proprio"
  ON public.familia_membros FOR SELECT
  USING (user_id = auth.uid() OR familia_id = public.familia_titular_de(auth.uid()));

DROP POLICY IF EXISTS "titular remove membro e membro sai" ON public.familia_membros;
CREATE POLICY "titular remove membro e membro sai"
  ON public.familia_membros FOR DELETE
  USING (user_id = auth.uid() OR familia_id = public.familia_titular_de(auth.uid()));

-- 3. Plano efetivo: uma única definição, usada pela trigger e pelo front.
CREATE OR REPLACE FUNCTION public.plano_efetivo(uid uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  proprio text;
BEGIN
  SELECT plan_type INTO proprio FROM public.profiles WHERE user_id = uid LIMIT 1;
  IF proprio IN ('INDIVIDUAL', 'FAMILIAR', 'MEI') THEN
    RETURN proprio;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.familia_membros m
    JOIN public.familias f ON f.id = m.familia_id
    JOIN public.profiles t ON t.user_id = f.titular_id
    WHERE m.user_id = uid AND m.status = 'ativo' AND t.plan_type = 'FAMILIAR'
  ) THEN
    RETURN 'FAMILIAR';
  END IF;
  RETURN 'FREE';
END;
$$;

-- plano_efetivo(uid) aceita qualquer id: fica restrito ao servidor. O cliente
-- usa meu_plano(), que só responde pelo próprio usuário.
REVOKE ALL ON FUNCTION public.plano_efetivo(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plano_efetivo(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.meu_plano()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.plano_efetivo(auth.uid());
$$;
REVOKE ALL ON FUNCTION public.meu_plano() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_plano() TO authenticated;

-- 3b. Situação familiar do usuário logado (o membro não lê o perfil do titular
-- pelo RLS; esta função entrega só o nome, para a tela da conta).
CREATE OR REPLACE FUNCTION public.minha_familia()
RETURNS TABLE (papel text, familia_id uuid, titular_nome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM (
    SELECT 'titular'::text AS papel, f.id AS familia_id, p.nome AS titular_nome
    FROM public.familias f
    LEFT JOIN public.profiles p ON p.user_id = f.titular_id
    WHERE f.titular_id = auth.uid()
    UNION ALL
    SELECT 'membro'::text, f.id, p.nome
    FROM public.familia_membros m
    JOIN public.familias f ON f.id = m.familia_id
    LEFT JOIN public.profiles p ON p.user_id = f.titular_id
    WHERE m.user_id = auth.uid() AND m.status = 'ativo'
  ) situacao
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.minha_familia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.minha_familia() TO authenticated;

-- 4. Limite de documentos por plano (substitui enforce_free_plan_document_limit).
-- FREE monitora 1 documento ATIVO (resolvido = false): marcar como renovado
-- libera a vaga; pagos não têm limite.
CREATE OR REPLACE FUNCTION public.enforce_plan_limits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ativos integer;
BEGIN
  IF public.plano_efetivo(NEW.usuario_id) = 'FREE' THEN
    SELECT count(*) INTO ativos
    FROM public.documentos
    WHERE usuario_id = NEW.usuario_id AND resolvido = false;
    IF ativos >= 1 THEN
      RAISE EXCEPTION 'PLAN_LIMIT';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_plan_document_limit_trigger ON public.documentos;
DROP TRIGGER IF EXISTS enforce_plan_limits_trigger ON public.documentos;
CREATE TRIGGER enforce_plan_limits_trigger
  BEFORE INSERT ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_limits();
DROP FUNCTION IF EXISTS public.enforce_free_plan_document_limit();

-- 5. Família: no máximo 4 pessoas (titular + 3 convites/membros).
CREATE OR REPLACE FUNCTION public.enforce_family_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pessoas integer;
BEGIN
  SELECT count(*) + 1 INTO pessoas FROM public.familia_membros WHERE familia_id = NEW.familia_id;
  IF pessoas > 4 THEN
    RAISE EXCEPTION 'FAMILY_LIMIT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_family_limit_trigger ON public.familia_membros;
CREATE TRIGGER enforce_family_limit_trigger
  BEFORE INSERT ON public.familia_membros
  FOR EACH ROW EXECUTE FUNCTION public.enforce_family_limit();

-- 6. Tipos empresariais (plano MEI) — espelhado em src/lib/validacao.ts.
ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_tipo_check;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_tipo_check
  CHECK (tipo IN ('cnh', 'crlv', 'ipva', 'passaporte', 'rg', 'seguro', 'plano_saude', 'carteira_trabalho',
                  'alvara', 'certidao', 'das_mei', 'outro'))
  NOT VALID;

-- 7. Webhook do Stripe: idempotência por evento; upserts por id do Stripe.
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  tipo text NOT NULL,
  recebido_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY; -- sem políticas: só service role

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_unico
  ON public.subscriptions (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_payment_id_unico
  ON public.payments (stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;
