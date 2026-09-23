-- Cancelar a assinatura mantém o plano até o fim do mês já pago.
--
-- Antes, cancelar rebaixava para FREE na hora, mesmo com o mês pago. Agora o
-- servidor (cancelar-assinatura e cakto-webhook, via aplicarAssinatura) grava
-- em subscriptions.acesso_ate o fim do período pago, e plano_efetivo trata a
-- assinatura como ativa até essa data. Reembolso e chargeback gravam null.
-- profiles.plan_type continua sendo o plano da assinatura ativa; nada precisa
-- rebaixar ninguém quando a data passa (plano_efetivo compara com now()).
--
-- subscriptions não tem política de INSERT/UPDATE para o usuário
-- (20260927120000_cobranca_cakto.sql): acesso_ate só é escrita pelo servidor.

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS acesso_ate timestamptz;

COMMENT ON COLUMN public.subscriptions.acesso_ate IS
  'Assinatura encerrada que ainda dá acesso até esta data (mês já pago). Escrita só pelo servidor.';

-- Plano pago da própria pessoa: o da assinatura ativa ou o de uma encerrada
-- ainda dentro do período pago.
CREATE OR REPLACE FUNCTION public.plano_proprio(uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT plan_type FROM public.profiles
      WHERE user_id = uid AND plan_type IN ('INDIVIDUAL', 'FAMILIAR', 'MEI')
      LIMIT 1),
    (SELECT plan_type FROM public.subscriptions
      WHERE usuario_id = uid AND acesso_ate > now() AND plan_type IN ('INDIVIDUAL', 'FAMILIAR', 'MEI')
      ORDER BY acesso_ate DESC
      LIMIT 1),
    'FREE'
  );
$$;

REVOKE ALL ON FUNCTION public.plano_proprio(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plano_proprio(uuid) TO service_role;

-- Mesma assinatura e mesmos grants de 20260915120000_planos_e_familia.sql; o
-- titular da família também vale pelo plano_proprio (membros seguem com o plano
-- até o fim do mês que o titular pagou).
CREATE OR REPLACE FUNCTION public.plano_efetivo(uid uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  proprio text;
BEGIN
  proprio := public.plano_proprio(uid);
  IF proprio <> 'FREE' THEN
    RETURN proprio;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.familia_membros m
    JOIN public.familias f ON f.id = m.familia_id
    WHERE m.user_id = uid AND m.status = 'ativo' AND public.plano_proprio(f.titular_id) = 'FAMILIAR'
  ) THEN
    RETURN 'FAMILIAR';
  END IF;
  RETURN 'FREE';
END;
$$;

REVOKE ALL ON FUNCTION public.plano_efetivo(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plano_efetivo(uuid) TO service_role;
